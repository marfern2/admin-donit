import { expectTypeOf } from 'vitest';
import { PublicDemoStats, PublicDemoTask, PublicDemoTaskType, PublicDemoUser } from './public-demo.model';

describe('public DTO privacy', () => {
  it('contains only fields exposed by the public API', () => {
    expectTypeOf<keyof PublicDemoUser>().toEqualTypeOf<'publicId' | 'handle' | 'displayName' | 'bio'>();
    expectTypeOf<keyof PublicDemoTaskType>().toEqualTypeOf<'publicId' | 'userPublicId' | 'name' | 'description' | 'color'>();
    expectTypeOf<keyof PublicDemoTask>().toEqualTypeOf<'publicId' | 'userPublicId' | 'taskTypePublicId' | 'title' | 'description' | 'dueDate' | 'completed' | 'urgency'>();
    expectTypeOf<keyof PublicDemoStats>().toEqualTypeOf<'users' | 'taskTypes' | 'tasks' | 'completedTasks'>();
  });
});
