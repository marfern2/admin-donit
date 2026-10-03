import { RuntimeConfigService } from './runtime-config.service';

describe('RuntimeConfigService', () => {
  afterEach(() => vi.unstubAllGlobals());

  function serve(body: string, status = 200): void {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { status })));
  }

  it('no ofrece ninguna API antes de cargar la configuracion', () => {
    expect(() => new RuntimeConfigService().apiUrl).toThrow('no se ha cargado');
  });

  it.each([
    ['DEV', 'https://donit-api-dev.marfern.dev/'],
    ['PROD', 'https://donit-api.marfern.dev'],
    ['LOCAL', 'http://localhost:8080'],
  ])('carga la API explicita de %s', async (_environment, apiUrl) => {
    serve(JSON.stringify({ apiUrl }));
    const service = new RuntimeConfigService();

    await service.load();

    expect(service.apiUrl).toBe(apiUrl.replace(/\/+$/, ''));
    expect(fetch).toHaveBeenCalledWith('/config/runtime-config.json', {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
  });

  it('falla cerrado si runtime-config.json devuelve 404', async () => {
    serve('', 404);
    const service = new RuntimeConfigService();

    await expect(service.load()).rejects.toThrow('404');
    expect(() => service.apiUrl).toThrow('no se ha cargado');
  });

  it.each([
    ['JSON invalido', '{'],
    ['apiUrl ausente', '{}'],
    ['URL invalida', '{"apiUrl":"https://"}'],
    ['HTTP remoto', '{"apiUrl":"http://donit-api-dev.marfern.dev"}'],
  ])('falla cerrado con %s', async (_case, body) => {
    serve(body);
    const service = new RuntimeConfigService();

    await expect(service.load()).rejects.toThrow();
    expect(() => service.apiUrl).toThrow('no se ha cargado');
  });

  it('retira la URL anterior si una recarga falla', async () => {
    serve('{"apiUrl":"https://donit-api.marfern.dev"}');
    const service = new RuntimeConfigService();
    await service.load();
    serve('', 404);

    await expect(service.load()).rejects.toThrow('404');
    expect(() => service.apiUrl).toThrow('no se ha cargado');
  });
});
