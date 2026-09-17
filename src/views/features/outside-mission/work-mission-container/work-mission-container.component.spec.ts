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

  it('shows the tab to a manager when the department setting is enabled', () => {
    const component = create({ manager: true }, { departments: [], isWorkMissionEnabled: true });
    expect(component.canAssign).toBeTrue();
  });

  it('hides the tab from a manager or HR officer when the setting is disabled', () => {
    expect(create({ manager: true }, { isWorkMissionEnabled: false }).canAssign).toBeFalse();
    TestBed.resetTestingModule();
    expect(create({ hr: true }, { isWorkMissionEnabled: false }).canAssign).toBeFalse();
  });

  it('hides the tab when the resolver produced no data', () => {
    expect(create({ manager: true }, null).canAssign).toBeFalse();
  });

  it('hides the tab from an employee without a management role', () => {
    expect(create({}, { isWorkMissionEnabled: true }).canAssign).toBeFalse();
  });
});
