/*
  © Copyright 2021-2022  Istituto di Linguistica Computazionale "A. Zampolli", Consiglio Nazionale delle Ricerche, Pisa, Italy.
 
This file is part of EpiLexo.

EpiLexo is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

EpiLexo is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with EpiLexo. If not, see <https://www.gnu.org/licenses/>.
*/

import { HttpClient } from '@angular/common/http';
import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { DataTableDirective } from 'angular-datatables';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-profiles-table',
  templateUrl: './profiles-table.component.html',
  styleUrls: ['./profiles-table.component.scss']
})
export class ProfilesTableComponent implements OnInit, AfterViewInit {

  message = '';

  @ViewChild(DataTableDirective, {static: false})

  datatableElement!: DataTableDirective;

  dtOptions: DataTables.Settings = {};
  users: [];
  dtTrigger: Subject<any> = new Subject<any>();


  constructor(private httpClient: HttpClient) { }

  someClickHandler(info: any): void {
    this.message = info.id + ' - ' + info.firstname;
    //console.log(this.message);
  }

  ngOnInit(): void {
    this.dtOptions = {
      pagingType: 'full_numbers',
      pageLength: 10
    };
    this.httpClient.get<any[]>('http://lari2.ilc.cnr.it:81/belexo/api/getUsers?requestUUID=12')
      .subscribe(data => {
        this.users = (data as any).users;
        //console.log(this.users)
        // Calling the DT trigger to manually render the table
        this.dtTrigger.next();
      });
  }

  ngAfterViewInit(): void {
    
    setTimeout(() => {
      this.datatableElement.dtInstance.then((dtInstance: DataTables.Api) => {
        dtInstance.columns().every(function () {
          const that = this;
          $('input', this.footer()).on('keyup change', function () {
            if (that.search() !== this['value']) {
              that
                .search(this['value'])
                .draw();
            }
          });
        });
      });
    }, 200);
    
  }
}
