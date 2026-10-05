import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateAudit } from './audit-dependencies.mjs';

const advisory = {
  name: 'http-cache-semantics',
  url: 'https://github.com/advisories/GHSA-ch52-4w7c-c8xp',
  severity: 'high',
  range: '<=4.2.0',
};
const majorFix = { name: '@angular/cli', version: '22.2.1', isSemVerMajor: true };

function installedPath() {
  return {
    dependencies: {
      '@angular/cli': {
        dependencies: {
          pacote: {
            dependencies: {
              'npm-registry-fetch': {
                dependencies: {
                  'make-fetch-happen': {
                    dependencies: { 'http-cache-semantics': { version: '4.2.0' } },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}

function fixture() {
  const vulnerabilities = {
    'http-cache-semantics': {
      severity: 'high',
      via: [advisory],
      fixAvailable: majorFix,
    },
    'make-fetch-happen': {
      severity: 'high',
      via: ['http-cache-semantics'],
      fixAvailable: majorFix,
    },
    '@angular/cli': {
      severity: 'high',
      via: ['make-fetch-happen'],
      fixAvailable: majorFix,
    },
  };
  return {
    audit: { metadata: { vulnerabilities: { high: 3, critical: 0 } }, vulnerabilities },
    fullTree: installedPath(),
    productionTree: { dependencies: {} },
    lock: {
      packages: {
        '': { devDependencies: { '@angular/cli': '^21.2.24' }, dependencies: {} },
        'node_modules/http-cache-semantics': { version: '4.2.0', dev: true },
      },
    },
    publishedVersions: ['4.1.1', '4.2.0'],
  };
}

function addOtherFinding(data, severity) {
  data.audit.vulnerabilities['other-package'] = {
    severity,
    via: [
      {
        name: 'other-package',
        url: 'https://github.com/advisories/GHSA-aaaa-bbbb-cccc',
        severity,
        range: '<2.0.0',
      },
    ],
    fixAvailable: false,
  };
  data.audit.metadata.vulnerabilities[severity] += 1;
}

test('sin findings: PASS', () => {
  const data = fixture();
  data.audit.vulnerabilities = {};
  data.audit.metadata.vulnerabilities.high = 0;
  assert.deepEqual(evaluateAudit(data), { allowed: [], blocking: [] });
});

test('solo advisory conocido, exclusivamente DEV y sin patch: PASS', () => {
  const result = evaluateAudit(fixture());
  assert.equal(result.blocking.length, 0);
  assert.deepEqual(result.allowed, ['http-cache-semantics', 'make-fetch-happen', '@angular/cli']);
});

test('mismo advisory en el arbol runtime: FAIL', () => {
  const data = fixture();
  data.productionTree = installedPath();
  assert.match(evaluateAudit(data).blocking.join(' '), /not exclusively under DEV/);
});

test('mismo advisory con fix compatible indicado por npm audit: FAIL', () => {
  const data = fixture();
  data.audit.vulnerabilities['http-cache-semantics'].fixAvailable = {
    name: 'http-cache-semantics',
    version: '4.2.1',
    isSemVerMajor: false,
  };
  assert.match(evaluateAudit(data).blocking.join(' '), /compatible fix/);
});

test('audit propone fix=true por 4.3.0, version publicada sin corregir: PASS', () => {
  const data = fixture();
  data.audit.vulnerabilities = {
    'http-cache-semantics': {
      severity: 'high',
      via: [advisory],
      fixAvailable: true,
    },
  };
  data.audit.metadata.vulnerabilities.high = 1;
  data.publishedVersions.push('4.3.0');
  assert.deepEqual(evaluateAudit(data), { allowed: ['http-cache-semantics'], blocking: [] });
});

test('audit propone fix=true y aparece otra version estable: FAIL', () => {
  const data = fixture();
  data.audit.vulnerabilities['http-cache-semantics'].fixAvailable = true;
  data.publishedVersions.push('4.3.0', '4.3.1');
  assert.match(evaluateAudit(data).blocking.join(' '), /compatible fix|patched version is published/);
});

test('audit propone fix=true pero falta metadata de versiones: FAIL', () => {
  const data = fixture();
  data.audit.vulnerabilities['http-cache-semantics'].fixAvailable = true;
  data.publishedVersions = undefined;
  assert.match(evaluateAudit(data).blocking.join(' '), /compatible fix|cannot verify published versions/);
});

test('formato incompleto de fixAvailable: FAIL cerrado', () => {
  const data = fixture();
  data.audit.vulnerabilities['http-cache-semantics'].fixAvailable = {
    isSemVerMajor: true,
  };
  data.publishedVersions.push('4.3.0');
  assert.match(evaluateAudit(data).blocking.join(' '), /compatible fix/);
});

test('patch publicado en el registro: FAIL aunque audit aun proponga un major', () => {
  const data = fixture();
  data.publishedVersions.push('4.2.1');
  assert.match(evaluateAudit(data).blocking.join(' '), /patched version is published/);
});

test('otro high: FAIL', () => {
  const data = fixture();
  data.audit.vulnerabilities = {};
  data.audit.metadata.vulnerabilities.high = 0;
  addOtherFinding(data, 'high');
  assert.match(evaluateAudit(data).blocking.join(' '), /unapproved high\/critical advisory/);
});

test('critical nuevo: FAIL', () => {
  const data = fixture();
  data.audit.vulnerabilities = {};
  data.audit.metadata.vulnerabilities.high = 0;
  addOtherFinding(data, 'critical');
  assert.match(evaluateAudit(data).blocking.join(' '), /unapproved high\/critical advisory/);
});

test('advisory permitido junto a otro high: FAIL', () => {
  const data = fixture();
  addOtherFinding(data, 'high');
  assert.match(evaluateAudit(data).blocking.join(' '), /unapproved high\/critical advisory/);
});

test('mismo advisory por otro tooling DEV: FAIL', () => {
  const data = fixture();
  data.fullTree.dependencies['other-tool'] = {
    dependencies: { 'http-cache-semantics': { version: '4.2.0' } },
  };
  assert.match(evaluateAudit(data).blocking.join(' '), /not exclusively under DEV/);
});
