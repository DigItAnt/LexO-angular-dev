﻿/*
  © Copyright 2021-2022  Istituto di Linguistica Computazionale "A. Zampolli", Consiglio Nazionale delle Ricerche, Pisa, Italy.
 
This file is part of EpiLexo.

EpiLexo is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

EpiLexo is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with EpiLexo. If not, see <https://www.gnu.org/licenses/>.
*/

import { HttpClient } from '@angular/common/http';
import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-profiles-table',
  templateUrl: './profiles-table.component.html',
  styleUrls: ['./profiles-table.component.scss']
})
export class ProfilesTableComponent implements OnInit {

  message = '';

  selectedCompanies;
  companies: any[] = [];
  companiesNames = ['ADMIN', 'USER', 'REVIEWER'];


  constructor(private httpClient: HttpClient) { }

 
  ngOnInit(): void {
    this.companiesNames.forEach((c, i) => {
      this.companies.push({ id: i, name: c });
    });
    
  }

  addTagFn(name) {
    return { name: name, tag: true };
  }
}
