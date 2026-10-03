#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import semver from 'semver';

const ALLOWED_ID = 'GHSA-ch52-4w7c-c8xp';
const ALLOWED_PACKAGE = 'http-cache-semantics';
const TOOLING_ROOT = '@angular/cli';
const BLOCKING_LEVELS = new Set(['high', 'critical']);

function npmJson(args, acceptedStatuses = [0]) {
  const result = spawnSync('npm', args, {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.error || !acceptedStatuses.includes(result.status)) {
    throw new Error(`npm ${args.join(' ')} failed: ${result.error?.message ?? result.stderr}`);
  }
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(`npm ${args.join(' ')} did not return valid JSON: ${result.stderr}`);
  }
}

function dependencyPaths(tree, packageName, parents = []) {
  return Object.entries(tree?.dependencies ?? {}).flatMap(([name, dependency]) => {
    const path = [...parents, name];
    return [
      ...(name === packageName ? [{ path, version: dependency.version }] : []),
      ...dependencyPaths(dependency, packageName, path),
    ];
  });
}

function advisoryOrigins(audit, packageName, visited = new Set()) {
  if (visited.has(packageName)) throw new Error(`Cycle in audit chain at ${packageName}`);
  const finding = audit.vulnerabilities[packageName];
  if (!finding || !Array.isArray(finding.via) || finding.via.length === 0) {
    throw new Error(`Incomplete audit chain at ${packageName}`);
  }
  const nextVisited = new Set([...visited, packageName]);
  return finding.via.flatMap((item) =>
    typeof item === 'string' ? advisoryOrigins(audit, item, nextVisited) : [item],
  );
}

function isAllowedOrigin(origin) {
  return (
    origin?.name === ALLOWED_PACKAGE &&
    origin?.url === `https://github.com/advisories/${ALLOWED_ID}` &&
    typeof origin.range === 'string' &&
    origin.range.length > 0
  );
}

function hasCompatibleFix(fixAvailable) {
  if (fixAvailable === false) return false;
  return fixAvailable === true || fixAvailable?.isSemVerMajor !== true;
}

export function evaluateAudit({ audit, fullTree, productionTree, lock, publishedVersions }) {
  if (!audit || audit.error || !audit.metadata?.vulnerabilities || !audit.vulnerabilities) {
    return { allowed: [], blocking: ['npm audit did not return a complete report'] };
  }

  const blocking = [];
  const allowed = [];
  let allowedOrigin;
  const findings = Object.values(audit.vulnerabilities);
  const reportedBlockingCount =
    audit.metadata.vulnerabilities.high + audit.metadata.vulnerabilities.critical;
  if (
    !Number.isInteger(reportedBlockingCount) ||
    reportedBlockingCount !== findings.filter((finding) => BLOCKING_LEVELS.has(finding.severity)).length
  ) {
    blocking.push('npm audit summary does not match high/critical findings');
  }

  for (const [name, finding] of Object.entries(audit.vulnerabilities)) {
    if (!BLOCKING_LEVELS.has(finding.severity)) continue;
    let origins;
    try {
      origins = advisoryOrigins(audit, name);
    } catch (error) {
      blocking.push(`${name}: ${error.message}`);
      continue;
    }
    if (
      finding.severity !== 'high' ||
      !origins.every((origin) => isAllowedOrigin(origin) && origin.severity === 'high')
    ) {
      blocking.push(`${name}: unapproved high/critical advisory`);
      continue;
    }
    if (hasCompatibleFix(finding.fixAvailable)) {
      blocking.push(`${name}: a compatible fix is available or fix status is unknown`);
      continue;
    }
    allowedOrigin = origins[0];
    allowed.push(name);
  }

  if (allowed.length > 0) {
    const paths = dependencyPaths(fullTree, ALLOWED_PACKAGE);
    const productionPaths = dependencyPaths(productionTree, ALLOWED_PACKAGE);
    const installed = Object.entries(lock?.packages ?? {}).filter(
      ([path]) =>
        path === `node_modules/${ALLOWED_PACKAGE}` ||
        path.endsWith(`/node_modules/${ALLOWED_PACKAGE}`),
    );
    if (
      paths.length === 0 ||
      paths.some(({ path }) => path[0] !== TOOLING_ROOT) ||
      productionPaths.length > 0 ||
      fullTree?.problems?.length > 0 ||
      productionTree?.problems?.length > 0 ||
      installed.length === 0 ||
      installed.some(([, entry]) => entry.dev !== true) ||
      !lock?.packages?.['']?.devDependencies?.[TOOLING_ROOT] ||
      lock?.packages?.['']?.dependencies?.[TOOLING_ROOT]
    ) {
      blocking.push(`${ALLOWED_ID}: package is not exclusively under DEV ${TOOLING_ROOT}`);
    }
    if (
      !semver.validRange(allowedOrigin.range) ||
      paths.some(({ version }) => !semver.valid(version) || !semver.satisfies(version, allowedOrigin.range)) ||
      installed.some(([, entry]) =>
        !semver.valid(entry.version) || !semver.satisfies(entry.version, allowedOrigin.range),
      )
    ) {
      blocking.push(`${ALLOWED_ID}: installed version does not match the advisory range`);
    }
    if (
      !Array.isArray(publishedVersions) ||
      publishedVersions.length === 0 ||
      publishedVersions.some((version) => !semver.valid(version))
    ) {
      blocking.push(`${ALLOWED_ID}: cannot verify published versions`);
    } else if (
      publishedVersions.some(
        (version) => !semver.prerelease(version) && !semver.satisfies(version, allowedOrigin.range),
      )
    ) {
      blocking.push(`${ALLOWED_ID}: a patched version is published; remove the exception`);
    }
  }

  return { allowed: [...new Set(allowed)], blocking };
}

function main() {
  const audit = npmJson(['audit', '--json'], [0, 1]);
  const hasCandidate = Object.values(audit.vulnerabilities ?? {}).some(
    (finding) => BLOCKING_LEVELS.has(finding.severity),
  );
  const fullTree = hasCandidate ? npmJson(['ls', ALLOWED_PACKAGE, '--all', '--json'], [0, 1]) : undefined;
  const productionTree = hasCandidate ? npmJson(['ls', '--omit=dev', '--all', '--json']) : undefined;
  const lock = hasCandidate ? JSON.parse(readFileSync('package-lock.json', 'utf8')) : undefined;
  const publishedVersions = hasCandidate
    ? npmJson(['view', ALLOWED_PACKAGE, 'versions', '--json', '--prefer-online'])
    : undefined;
  const result = evaluateAudit({ audit, fullTree, productionTree, lock, publishedVersions });

  for (const name of result.allowed) {
    console.log(`ALLOWED KNOWN DEV-ONLY ADVISORY ${ALLOWED_ID}: ${name}`);
  }
  for (const reason of result.blocking) {
    console.error(`BLOCKING SECURITY FINDING: ${reason}`);
  }
  if (result.blocking.length > 0) process.exitCode = 1;
  else console.log('Full dependency security gate passed.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(`BLOCKING SECURITY FINDING: ${error.message}`);
    process.exitCode = 1;
  }
}
