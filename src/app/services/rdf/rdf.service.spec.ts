import { TestBed } from '@angular/core/testing';

import { RdfService } from './rdf.service';

describe('RdfService', () => {
  let service: RdfService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RdfService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
