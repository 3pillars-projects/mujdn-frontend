import { inject, Injectable } from '@angular/core';
import { UrlService } from '@/services/url.service';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SingleResponseData } from '@/models/shared/response/single-response-data';
import { AttendanceLogImportResult } from '@/models/shared/attendance-log-import-result';

@Injectable({
  providedIn: 'root',
})
export class ImportService {
  urlService = inject(UrlService);
  getUrlSegment(): string {
    return this.urlService.URLS.IMPORT;
  }
  private baseUrl = this.getUrlSegment(); // adjust as needed

  constructor(private http: HttpClient) {}

  importEmployees(formData: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/employees-excel`, formData, { withCredentials: true });
  }

  importDepartments(formData: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/departments-excel`, formData, { withCredentials: true });
  }

  importAttendanceLogsXml(formData: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/attendance-logs-xml`, formData, {
      withCredentials: true,
    });
  }

  /**
   * Imports fingerprint (swipe) rows from an .xlsx file (ADMIN only). The template is the static
   * `assets/import-templates/import-fingerprints-template.xlsx`; `language` selects the language of
   * the reasons in the returned review workbook.
   */
  importAttendanceLogsExcel(
    formData: FormData,
    language: string
  ): Observable<SingleResponseData<AttendanceLogImportResult>> {
    return this.http.post<SingleResponseData<AttendanceLogImportResult>>(
      `${this.baseUrl}/attendance-logs-excel`,
      formData,
      { params: new HttpParams().set('language', language), withCredentials: true }
    );
  }
}
