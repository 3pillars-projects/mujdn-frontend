import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '@/services/auth/auth.service';
import { WorkMissionService } from '@/services/features/business/work-mission.service';
import WorkMissionContainerComponent from './work-mission-container.component';

describe('WorkMissionContainerComponent management tab visibility', () => {
  const create = (roles: { manager?: boolean; hr?: boolean }, list: unknown) => {
    TestBed.configureTestingModule({
      imports: [WorkMissionContainerComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { data: { list } } } },
        {
          provide: AuthService,
          useValue: { isDepartmentManager: !!roles.manager, isHROfficer: !!roles.hr },
        },
        { provide: WorkMissionService, useValue: {} },
        { provide: MatDialog, useValue: {} },
      ],
    }).overrideComponent(WorkMissionContainerComponent, { set: { template: '' } });
    const component = TestBed.createComponent(WorkMissionContainerComponent).componentInstance;
    component.ngOnInit();
    return component;
  };

  it('shows the tab and the add button to a manager when the department setting is enabled', () => {
    const component = create({ manager: true }, { departments: [], isWorkMissionEnabled: true });
    expect(component.canManage).toBeTrue();
    expect(component.canCreate).toBeTrue();
  });

  it('hides the tab from a manager when the setting is disabled', () => {
    const component = create({ manager: true }, { isWorkMissionEnabled: false });
    expect(component.canManage).toBeFalse();
    expect(component.canCreate).toBeFalse();
  });

  it('always shows the tab to an HR officer, who decides missions from their whole scope', () => {
    const component = create({ hr: true }, { isWorkMissionEnabled: false });
    expect(component.canManage).toBeTrue();
    expect(component.canCreate).toBeFalse();
  });

  it('hides the tab when the resolver produced no data for a manager', () => {
    expect(create({ manager: true }, null).canManage).toBeFalse();
  });

  it('hides the tab from an employee without a management role', () => {
    const component = create({}, { isWorkMissionEnabled: true });
    expect(component.canManage).toBeFalse();
    expect(component.canCreate).toBeFalse();
  });
});
