import { FormBuilder } from '@angular/forms';
import { Department } from './department';

describe('Department.buildForm isWorkMissionEnabled', () => {
  const build = (value?: boolean | null) => {
    const department = new Department();
    if (value !== undefined) {
      department.isWorkMissionEnabled = value;
    }
    return new FormBuilder().group(department.buildForm());
  };

  it('defaults to enabled for a new department', () => {
    expect(build().get('isWorkMissionEnabled')?.value).toBeTrue();
  });

  it('defaults to enabled when the loaded value is null', () => {
    expect(build(null).get('isWorkMissionEnabled')?.value).toBeTrue();
  });

  it('keeps a loaded disabled value', () => {
    expect(build(false).get('isWorkMissionEnabled')?.value).toBeFalse();
  });
});
