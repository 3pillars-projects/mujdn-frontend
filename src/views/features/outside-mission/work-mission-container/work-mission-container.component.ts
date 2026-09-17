import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { Breadcrumb } from 'primeng/breadcrumb';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { PaginatorModule } from 'primeng/paginator';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { TabsModule } from 'primeng/tabs';
import { MyWorkMissionListComponent } from '@/views/features/outside-mission/my-work-mission-list/my-work-mission-list.component';
import { AssignWorkMissionListComponent } from '@/views/features/outside-mission/assign-work-mission-list/assign-work-mission-list.component';
import { PaginatedList } from '@/models/shared/response/paginated-list';
import { WorkMission } from '@/models/features/business/work-mission';
import { BaseLookupModel } from '@/models/features/lookups/base-lookup-model';
import { AuthService } from '@/services/auth/auth.service';
import { WorkMissionService } from '@/services/features/business/work-mission.service';
import { PaginationParams } from '@/models/shared/pagination-params';

@Component({
  selector: 'app-work-mission-container',
  imports: [
    Breadcrumb,
    InputTextModule,
    TableModule,
    CommonModule,
    RouterModule,
    PaginatorModule,
    DatePickerModule,
    TabsModule,
    FormsModule,
    TranslatePipe,
    MyWorkMissionListComponent,
    AssignWorkMissionListComponent,
  ],
  templateUrl: './work-mission-container.component.html',
  styleUrl: './work-mission-container.component.scss',
})
// Updated WorkMissionContainerComponent
export default class WorkMissionContainerComponent implements OnInit {
  breadcrumbs: MenuItem[] | undefined;
  home: MenuItem | undefined;
  missions = signal<PaginatedList<WorkMission>>(new PaginatedList<WorkMission>());
  departments = signal<BaseLookupModel[]>([]);
  matDialog = inject(MatDialog);
  dialog = inject(MatDialog);
  activatedRoute = inject(ActivatedRoute);
  authService = inject(AuthService);
  workMissionService = inject(WorkMissionService); // Add this service injection
  @ViewChild(AssignWorkMissionListComponent) assignTabComponent!: AssignWorkMissionListComponent;
  @ViewChild(MyWorkMissionListComponent) myMissionsTabComponent!: MyWorkMissionListComponent;

  canAssign = false;
  isAssignTabDataLoaded = false; // Track if assign tab data is loaded
  currentTabIndex = '0'; // Track current tab

  ngOnInit() {
    // Only set departments from resolver, not missions
    const resolved = this.activatedRoute.snapshot.data['list'];
    this.departments.set(resolved?.departments || []);
    // "My missions" stays visible; only the management tab follows the department setting.
    this.canAssign =
      !!(this.authService.isDepartmentManager || this.authService.isHROfficer) &&
      resolved?.isWorkMissionEnabled === true;
  }

  // Method to handle tab change
  onTabChange(tabValue: any) {
    this.currentTabIndex = tabValue;

    if (tabValue === '0') {
      // My Missions tab
      this.myMissionsTabComponent?.resetFilter(); // clear filters
      this.myMissionsTabComponent?.loadMyMissions(); // fetch fresh data
    }

    if (tabValue === '1' && this.canAssign) {
      // Assign Missions tab
      this.assignTabComponent?.resetFilter();
      this.loadAssignTabData();
    }
  }

  // Load missions data for assign tab
  private loadAssignTabData() {
    // Reset pagination for fresh fetch
    const pagination = new PaginationParams();
    pagination.pageNumber = 1; // start from first page
    pagination.pageSize = 10; // default page size, adjust as needed

    this.workMissionService.loadPaginated(pagination).subscribe({
      next: (response) => {
        // Always set the missions signal to fresh data
        this.missions.set(response || new PaginatedList<WorkMission>());
      },
      error: (error) => {
        console.error('Error loading missions data:', error);
        // Reset missions to empty in case of error
        this.missions.set(new PaginatedList<WorkMission>());
      },
    });
  }
}
