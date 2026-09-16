import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { EditUserDialogComponent, EditUserData } from './edit-user-dialog.component';

describe('EditUserDialogComponent', () => {
  let component: EditUserDialogComponent;
  let fixture: ComponentFixture<EditUserDialogComponent>;

  const defaultData: EditUserData = {
    username: 'testuser',
    email: 'test@test.com',
  };

  function createComponent(data: EditUserData = defaultData) {
    TestBed.configureTestingModule({
      imports: [EditUserDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });

    fixture = TestBed.createComponent(EditUserDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create', () => {
    createComponent();
    expect(component).toBeTruthy();
  });

  it('should prefill form with data', () => {
    createComponent();
    expect(component.form.get('username')?.value).toBe('testuser');
    expect(component.form.get('email')?.value).toBe('test@test.com');
  });

  it('should be invalid when username is empty', () => {
    createComponent();
    component.form.get('username')?.setValue('');
    expect(component.form.get('username')?.valid).toBeFalsy();
  });

  it('should be invalid when username is too short', () => {
    createComponent();
    component.form.get('username')?.setValue('ab');
    expect(component.form.get('username')?.valid).toBeFalsy();
  });

  it('should be invalid when email is empty', () => {
    createComponent();
    component.form.get('email')?.setValue('');
    expect(component.form.get('email')?.valid).toBeFalsy();
  });

  it('should be invalid when email is invalid', () => {
    createComponent();
    component.form.get('email')?.setValue('not-an-email');
    expect(component.form.get('email')?.valid).toBeFalsy();
  });

  it('should be valid with correct data', () => {
    createComponent();
    expect(component.form.valid).toBeTruthy();
  });

  it('should not close dialog when form is invalid', () => {
    createComponent();
    const dialogRef = TestBed.inject(MatDialogRef);
    component.form.get('email')?.setValue('invalid');
    component.onSubmit();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('should close dialog with form data on valid submit', () => {
    createComponent();
    const dialogRef = TestBed.inject(MatDialogRef);
    component.onSubmit();
    expect(dialogRef.close).toHaveBeenCalledWith({
      username: 'testuser',
      email: 'test@test.com',
    });
  });
});
