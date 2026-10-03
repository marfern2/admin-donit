import { TestBed } from '@angular/core/testing';
import { AdminAuthService } from './core/auth/auth.service';
import { RuntimeConfigService } from './core/config/runtime-config.service';
import { initializeApp } from './app.config';

describe('app initializer', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('carga runtime config antes de inicializar la sesion', async () => {
    let finishConfig!: (response: Response) => void;
    const fetchPromise = new Promise<Response>((resolve) => (finishConfig = resolve));
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(fetchPromise));
    const auth = { initialize: vi.fn().mockResolvedValue(undefined) };
    TestBed.configureTestingModule({ providers: [{ provide: AdminAuthService, useValue: auth }] });
    const config = TestBed.inject(RuntimeConfigService);

    const initialization = TestBed.runInInjectionContext(() => initializeApp());
    expect(auth.initialize).not.toHaveBeenCalled();
    expect(() => config.apiUrl).toThrow('no se ha cargado');

    finishConfig(new Response('{"apiUrl":"https://donit-api-dev.marfern.dev"}'));
    await initialization;

    expect(config.apiUrl).toBe('https://donit-api-dev.marfern.dev');
    expect(auth.initialize).toHaveBeenCalledOnce();
  });

  it('rechaza la inicializacion sin config y no inicia la sesion', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })));
    const auth = { initialize: vi.fn().mockResolvedValue(undefined) };
    TestBed.configureTestingModule({ providers: [{ provide: AdminAuthService, useValue: auth }] });

    await expect(TestBed.runInInjectionContext(() => initializeApp())).rejects.toThrow('404');
    expect(auth.initialize).not.toHaveBeenCalled();
  });
});
