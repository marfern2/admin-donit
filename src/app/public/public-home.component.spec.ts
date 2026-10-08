import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { PublicHomeComponent } from './public-home.component';
import { PublicDemoApiService } from './public-demo-api.service';
import { PublicDemoStats } from './public-demo.model';
import { ComponentFixture } from '@angular/core/testing';

describe('PublicHomeComponent', () => {
  let stats: Subject<PublicDemoStats>;
  let fixture: ComponentFixture<PublicHomeComponent>;
  beforeEach(() => {
    stats = new Subject();
    TestBed.configureTestingModule({ imports: [PublicHomeComponent], providers: [provideRouter([]), { provide: PublicDemoApiService, useValue: { stats: () => stats.asObservable() } }] });
    fixture = TestBed.createComponent(PublicHomeComponent);
    fixture.detectChanges();
  });
  it('shows loading and then exact backend metrics', () => {
    expect(fixture.nativeElement.querySelector('[aria-busy="true"]')).toBeTruthy();
    stats.next({ users: 1, taskTypes: 2, tasks: 3, completedTasks: 1 }); fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.demo-stat').length).toBe(4);
    expect(fixture.nativeElement.textContent).toContain('Tareas completadas');
  });
  it('shows a real empty state', () => {
    stats.next({ users: 0, taskTypes: 0, tasks: 0, completedTasks: 0 }); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Aún no hay elementos publicados');
  });
  it('shows errors without redirecting to admin login', () => {
    stats.error(new HttpErrorResponse({ status: 500 })); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain('temporalmente');
  });
});
