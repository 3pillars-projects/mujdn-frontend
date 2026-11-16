import { CommonModule } from '@angular/common';
import { Component, Inject, inject, OnInit, ElementRef, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Visit } from '@/models/features/visit/visit';
import { LANGUAGE_ENUM } from '@/enums/language-enum';
import { LAYOUT_DIRECTION_ENUM } from '@/enums/layout-direction-enum';
import { LanguageService } from '@/services/shared/language.service';
import { AlertService } from '@/services/shared/alert.service';
import { formatDateOnly, formatTimeTo12Hour } from '@/utils/general-helper';
import { getLocalizedName } from '@/utils/localized-name';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { QRCodeComponent } from 'angularx-qrcode';
import { BaseLookupModel } from '@/models/features/lookups/base-lookup-model';
import { AccessLocationLookup } from '@/models/features/business/access-location-lookup';

@Component({
  selector: 'app-qrcode-visit-request-popup',
  imports: [CommonModule, TranslatePipe, QRCodeComponent],
  templateUrl: './qrcode-visit-request-popup.component.html',
  styleUrl: './qrcode-visit-request-popup.component.scss',
})
export class QrcodeVisitRequestPopupComponent implements OnInit {
  declare model: Visit;
  declare direction: LAYOUT_DIRECTION_ENUM;

  alertService = inject(AlertService);
  translateService = inject(TranslateService);
  languageService = inject(LanguageService);
  dialogRef = inject(MatDialogRef);
  accessLocations: BaseLookupModel[] = [];

  // 🔹 Reference to the popup container
  @ViewChild('popupContent', { static: false }) popupContent!: ElementRef;

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {
    this.direction =
      this.languageService.getCurrentLanguage() == LANGUAGE_ENUM.ENGLISH
        ? LAYOUT_DIRECTION_ENUM.LTR
        : LAYOUT_DIRECTION_ENUM.RTL;
  }

  ngOnInit(): void {
    this.initPopup();
  }

  initPopup() {
    this.model = this.data.model || new Visit();
    this.accessLocations = this.data.accessLocations || [];
  }

  // Helper methods for template
  isCurrentLanguageEnglish(): boolean {
    return this.languageService.getCurrentLanguage() === LANGUAGE_ENUM.ENGLISH;
  }

  formatTime(timeString: string | Date | null | undefined): string {
    if (!timeString) return '';
    const locale = this.isCurrentLanguageEnglish() ? 'en-US' : 'ar-EG';
    return formatTimeTo12Hour(timeString.toString(), locale);
  }

  formatDate(dateString: string | Date | null | undefined): string {
    if (!dateString) return '';
    return formatDateOnly(dateString);
  }

  getDepartmentName(): string {
    return getLocalizedName(this.model.targetDepartment, this.languageService.getCurrentLanguage());
  }

  getLocationName(loc: BaseLookupModel): string {
    return getLocalizedName(loc, this.languageService.getCurrentLanguage());
  }
  getCreatorName(): string {
    return getLocalizedName(this.model.creationUser, this.languageService.getCurrentLanguage());
  }

  close() {
    this.dialogRef.close();
  }

  private getPdfFileName(): string {
    return `${this.translateService.instant('VISIT_REQUEST_PAGE.VISIT_REQUEST_PDF_FILE_NAME')}.pdf`;
  }

  // 🔹 Export PDF method
  async downloadAsPDF(): Promise<void> {
    if (!this.popupContent) return;

    const element = this.popupContent.nativeElement;

    const canvas = await html2canvas(element, {
      scale: 2, // higher scale = better quality
      useCORS: true, // if images are hosted externally
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');

    // Calculate image dimensions to fit A4
    const imgWidth = 195; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 15;

    // Add first page
    pdf.addImage(imgData, 'PNG', 5, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Add extra pages if content is longer than one A4
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(this.getPdfFileName());
  }
  get selectedAccessLocations() {
    const ids = this.model.accessLocationIds || [];
    return this.accessLocations.filter((loc) => ids.includes(loc.id!));
  }
}
