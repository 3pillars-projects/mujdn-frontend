import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { Department } from '@/models/features/lookups/department/department';
import { LanguageService } from '@/services/shared/language.service';
import { CommonModule } from '@angular/common';
import {
  Component,
  effect,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnInit,
  Output,
  Signal,
  SimpleChanges,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PrimeTemplate, TreeNode } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';
import { Tree } from 'primeng/tree';

@Component({
  selector: 'app-department-tree',
  imports: [Tree, PrimeTemplate, TooltipModule, TranslatePipe, CommonModule],
  standalone: true,
  templateUrl: './department-tree.component.html',
  styleUrl: './department-tree.component.scss',
})
export class DepartmentTreeComponent implements OnInit, OnChanges {
  departments: TreeNode[] = [];
  selectedNode: TreeNode | null = null;
  @Input() departmentsTree: Department[] = [];
  @Input() selectedDepartmentSignal!: Signal<Department | null>;
  @Output() departmentSelected = new EventEmitter<Department>();
  @Output() closed = new EventEmitter<void>();

  // Nodes whose label is cut off by the ellipsis; only these show the full-name tooltip.
  readonly truncatedNodes = new WeakSet<TreeNode>();

  languageService = inject(LanguageService);
  ngOnInit() {
    this.translateDepartmentName();
  }
  // React to changes in the selectedDepartmentSignal using effect
  private readonly selectedDepartmentEffect = effect(() => {
    const selectedDepartment = this.selectedDepartmentSignal();
    if (selectedDepartment && this.departments.length > 0) {
      this.selectedNode = this.findTreeNodeByDepartment(selectedDepartment, this.departments);
    }
  });

  // Add this helper to extract all departments from the tree
  private extractAllDepartmentsFromTree(tree: Department[]): Department[] {
    const all: Department[] = [];
    const traverse = (depts: Department[]) => {
      for (const dept of depts) {
        all.push(dept);
        if (dept.childDepartments) traverse(dept.childDepartments);
      }
    };
    traverse(tree);
    return all;
  }
  constructor() {}
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['departmentsTree'] && this.departmentsTree.length > 0) {
      this.rebuildTree();
    }
  }

  private rebuildTree() {
    const selectedDepartment = this.selectedDepartmentSignal();
    if (selectedDepartment && this.departmentsTree.length > 0) {
      const allDepartments = this.extractAllDepartmentsFromTree(this.departmentsTree);
      const rootDepartment = this.findRootDepartment(selectedDepartment, allDepartments);
      if (rootDepartment) {
        this.departments = [this.mapDepartmentToTreeNode(rootDepartment)];
        // لا تقم بعمل expand هنا
      }
      this.selectedNode = this.findTreeNodeByDepartment(selectedDepartment, this.departments);
    } else if (this.departmentsTree.length > 0) {
      this.departments = this.mapDepartmentToTreeNodeArray(this.departmentsTree);
      // لا تقم بعمل expand هنا أيضًا
      this.selectedNode = null;
    }
  }

  onNodeExpand(event: any) {
    const expandedNode = event.node;

    // ابحث عن الأب (الذي يحتوي هذا العنصر كـ child)
    const parentNode = this.findParentNode(this.departments, expandedNode);

    // أحصل على إخوان هذا العنصر فقط (نفس المستوى)
    const siblings = parentNode?.children ?? this.departments;

    siblings.forEach((sibling) => {
      if (sibling !== expandedNode) {
        this.collapseAll(sibling);
      }
    });
  }

  private findParentNode(nodes: TreeNode[], targetNode: TreeNode): TreeNode | null {
    for (const node of nodes) {
      if (node.children?.includes(targetNode)) {
        return node;
      }

      if (node.children) {
        const parent = this.findParentNode(node.children, targetNode);
        if (parent) return parent;
      }
    }
    return null;
  }

  private collapseAll(node: TreeNode): void {
    node.expanded = false;
    if (node.children?.length) {
      node.children.forEach((child) => this.collapseAll(child));
    }
  }

  private expandAllNodes(nodes: TreeNode[]): void {
    if (!nodes) return;
    for (let node of nodes) {
      node.expanded = true;
      if (node.children?.length) {
        this.expandAllNodes(node.children);
      }
    }
  }

  private mapDepartmentToTreeNodeArray(departments: Department[]): TreeNode[] {
    return departments.map((department) => this.mapDepartmentToTreeNode(department));
  }

  private mapDepartmentToTreeNode = (department: Department): TreeNode => {
    return {
      label:
        this.languageService.getCurrentLanguage() === LANGUAGE_ENUM.ENGLISH
          ? department.nameEn
          : department.nameAr,
      data: department,
      children: department.childDepartments?.map(this.mapDepartmentToTreeNode) || [],
    };
  };

  private findRootDepartment(
    department: Department,
    allDepartments: Department[]
  ): Department | null {
    // Traverse up the hierarchy to find the root department
    let current = department;
    while (current.fkParentDepartmentId) {
      const parent = allDepartments.find((dept) => dept.id === current.fkParentDepartmentId);
      if (!parent) {
        return null; // Return null if the parent department is not found
      }
      current = parent;
    }
    return current; // Return the root department (the one with fkParentDepartmentId === null)
  }

  private findTreeNodeByDepartment(
    department: Department,
    nodes: TreeNode[],
    path: TreeNode[] = []
  ): TreeNode | null {
    for (const node of nodes) {
      const newPath = [...path, node];

      if (node.data.id === department.id) {
        // Expand all parents in the path
        newPath.forEach((p) => (p.expanded = true));
        return node;
      }

      if (node.children) {
        const childNode = this.findTreeNodeByDepartment(department, node.children, newPath);
        if (childNode) {
          return childNode;
        }
      }
    }
    return null;
  }

  updateTreeLabels() {
    const updateNodeLabelRecursively = (node: TreeNode): TreeNode => {
      const dept = node.data as Department;
      const label =
        this.languageService.getCurrentLanguage() === LANGUAGE_ENUM.ENGLISH
          ? dept.nameEn
          : dept.nameAr;

      return {
        ...node,
        label,
        children: node.children?.map(updateNodeLabelRecursively) || [],
      };
    };

    this.departments = this.departments.map(updateNodeLabelRecursively);
  }

  onNodeSelect(event: any) {
    if (event.node) {
      event.node.expanded = true; // Re-expand the selected node if it collapsed
      this.departmentSelected.emit(event.node.data);
    }
  }

  unselectNode(event: any) {
    setTimeout(() => {
      this.selectedNode = event.node;
    });
  }

  private translateDepartmentName() {
    this.languageService.languageChanged$.subscribe(() => {
      if (this.departments.length > 0) {
        this.updateTreeLabels();
      }
    });
  }
  checkLabelTruncated(label: HTMLElement, node: TreeNode) {
    if (label.scrollWidth > label.clientWidth) {
      this.truncatedNodes.add(node);
    } else {
      this.truncatedNodes.delete(node);
    }
  }

  toggleTree() {
    this.closed.emit(); // بلغ الأب بس
  }
}
