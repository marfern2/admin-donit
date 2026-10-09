import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DemoEditorDialogComponent, DemoEditorData } from './demo-editor-dialog.component';

describe('DemoEditorDialogComponent', () => {
  const close = vi.fn();
  function create(data: DemoEditorData): DemoEditorDialogComponent {
    TestBed.configureTestingModule({ imports: [DemoEditorDialogComponent], providers: [
      { provide: MAT_DIALOG_DATA, useValue: data }, { provide: MatDialogRef, useValue: { close } },
    ] });
    const fixture = TestBed.createComponent(DemoEditorDialogComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }
  beforeEach(() => close.mockClear());

  it('validates user handle and visible name', () => {
    const editor = create({ kind: 'users', users: [], types: [] });
    editor.form.patchValue({ handle: 'a', displayName: 'A' }); editor.save();
    expect(close).not.toHaveBeenCalled();
    editor.form.patchValue({ handle: 'valid_demo', displayName: 'Usuario Demo', bio: 'Perfil' }); editor.save();
    expect(close).toHaveBeenCalledWith({ handle: 'valid_demo', displayName: 'Usuario Demo', bio: 'Perfil' });
  });

  it('validates type color and owner', () => {
    const editor = create({ kind: 'task-types', users: [], types: [] });
    editor.form.patchValue({ demoUserId: '1', name: 'Trabajo', color: 'blue' }); editor.save();
    expect(close).not.toHaveBeenCalled();
    editor.form.patchValue({ color: '#123ABC' }); editor.save();
    expect(close).toHaveBeenCalledWith({ demoUserId: 1, name: 'Trabajo', description: null, color: '#123ABC' });
  });

  it('clears a type from another user when the owner changes', () => {
    const types = [
      { id: 11, demoUserId: 1, name: 'Uno' },
      { id: 22, demoUserId: 2, name: 'Dos' },
    ] as DemoEditorData['types'];
    const editor = create({ kind: 'tasks', users: [], types });
    editor.form.patchValue({ demoUserId: '1', demoTaskTypeId: '11', title: 'Tarea válida', dueDate: '2026-10-20', urgency: 1 });
    editor.form.controls.demoUserId.setValue('2'); editor.userChanged();
    expect(editor.form.controls.demoTaskTypeId.value).toBe('');
    editor.save(); expect(close).not.toHaveBeenCalled();
    editor.form.controls.demoTaskTypeId.setValue('22'); editor.save();
    expect(close).toHaveBeenCalledWith(expect.objectContaining({ demoUserId: 2, demoTaskTypeId: 22 }));
  });
});
