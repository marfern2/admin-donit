import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  let component: ConfirmDialogComponent;
  let fixture: ComponentFixture<ConfirmDialogComponent>;
  let dialogRefSpy: { close: ReturnType<typeof vi.fn> };

  const defaultData: ConfirmDialogData = {
    title: 'Confirmar acción',
    message: '¿Estás seguro?',
    confirmLabel: 'Aceptar',
    warn: false,
  };

  function createComponent(data: ConfirmDialogData = defaultData) {
    dialogRefSpy = { close: vi.fn() };

    TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });

    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create', () => {
    createComponent();
    expect(component).toBeTruthy();
  });

  it('should render title and message', () => {
    createComponent();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Confirmar acción');
    expect(el.textContent).toContain('¿Estás seguro?');
  });

  it('should render custom confirm label', () => {
    createComponent({ ...defaultData, confirmLabel: 'Eliminar' });
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Eliminar');
  });

  it('should render default confirm label when not provided', () => {
    createComponent({ title: 'Test', message: 'Msg' });
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Confirmar');
  });

  it('should close with false on cancel', () => {
    createComponent();
    const cancelButton = fixture.nativeElement.querySelector('button[aria-label="Cancelar"]');
    cancelButton.click();
    expect(dialogRefSpy.close).toHaveBeenCalled();
  });

  it('should close with true on confirm', () => {
    createComponent();
    const confirmButton = fixture.nativeElement.querySelector('button[aria-label="Confirmar"]');
    confirmButton.click();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
  });
});
