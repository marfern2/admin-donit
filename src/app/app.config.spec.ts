import { TestBed } from '@angular/core/testing';
import { RuntimeConfigService } from './core/config/runtime-config.service';
import { initializeApp } from './app.config';

describe('app initializer', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('carga runtime config sin restaurar la sesion admin', async () => {
    let finishConfig!: (response: Response) => void;
    const fetchPromise = new Promise<Response>((resolve) => (finishConfig = resolve));
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(fetchPromise));
    TestBed.configureTestingModule({});
    const config = TestBed.inject(RuntimeConfigService);

    const initialization = TestBed.runInInjectionContext(() => initializeApp());
    expect(() => config.apiUrl).toThrow('no se ha cargado');

    finishConfig(new Response('{"apiUrl":"https://donit-api-dev.marfern.dev"}'));
    await initialization;

    expect(config.apiUrl).toBe('https://donit-api-dev.marfern.dev');
  });

  it('rechaza la inicializacion sin config', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })));
    TestBed.configureTestingModule({});

    await expect(TestBed.runInInjectionContext(() => initializeApp())).rejects.toThrow('404');
  });
});
