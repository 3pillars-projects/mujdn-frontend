import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UrlService } from '@/services/url.service';
import { WorkMissionService } from './work-mission.service';

describe('WorkMissionService.isWorkMissionEnabled', () => {
  const url = 'https://api.test/api/WorkMission/is-enabled';
  let service: WorkMissionService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: UrlService,
          useValue: { URLS: { WORK_MISSION: 'https://api.test/api/WorkMission' } },
        },
      ],
    });
    service = TestBed.inject(WorkMissionService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  for (const [data, expected] of [
    [true, true],
    [false, false],
    [null, false],
  ] as const) {
    it(`maps data=${data} to ${expected}`, () => {
      let result: boolean | undefined;
      service.isWorkMissionEnabled().subscribe((value) => (result = value));

      const req = httpTesting.expectOne(url);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBeTrue();
      req.flush({ data, error: null });

      expect(result).toBe(expected);
    });
  }
});
