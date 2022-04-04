/*
  © Copyright 2021-2022  Istituto di Linguistica Computazionale "A. Zampolli", Consiglio Nazionale delle Ricerche, Pisa, Italy.
 
This file is part of EpiLexo.

EpiLexo is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

EpiLexo is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with EpiLexo. If not, see <https://www.gnu.org/licenses/>.
*/

import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { LexicalEntriesService } from 'src/app/services/lexical-entries/lexical-entries.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-same-as',
  templateUrl: './same-as.component.html',
  styleUrls: ['./same-as.component.scss']
})
export class SameAsComponent implements OnInit {

  @Input() sameAsData: any[] | any;

  private subject: Subject<any> = new Subject();
  private subject_input: Subject<any> = new Subject();
  subscription: Subscription;
  object: any;
  searchResults: [];
  filterLoading = false;

  memorySameAs = [];
  isSense;
  isForm;
  isLexEntry;

  sameAsForm = new FormGroup({
    sameAsArray: new FormArray([this.createSameAsEntry()])
  })

  sameAsArray: FormArray;

  constructor(private formBuilder: FormBuilder, private lexicalService : LexicalEntriesService, private toastr: ToastrService) {
  }

  ngOnInit() {
    this.sameAsForm = this.formBuilder.group({
      sameAsArray: this.formBuilder.array([])
    })

    /* this.subject.pipe(debounceTime(1000)).subscribe(
      data => {
        this.onSearchFilter(data)
      }
    ) */

    this.subject_input.pipe(debounceTime(1000)).subscribe(
      data => {        
        this.onChangeSameAsByInput(data['value'], data['i'])
      }
    )
  
    this.triggerTooltip();
  }

  ngOnChanges(changes: SimpleChanges) {
    setTimeout(() => {
      if(changes.sameAsData.currentValue != undefined){
        this.object = changes.sameAsData.currentValue;
        this.sameAsArray = this.sameAsForm.get('sameAsArray') as FormArray;
        this.sameAsArray.clear();
        
        this.memorySameAs = [];
        //console.log(this.object)
  
        this.object.array.forEach(element => {
          this.addSameAsEntry(element.lexicalEntity, element.inferred)
          this.memorySameAs.push(element.lexicalEntity);
        });

        //console.log(this.memorySameAs)

        if(this.object.lexicalEntryInstanceName != undefined){
          this.isLexEntry = true;
          this.isForm = false;
          this.isSense = false;
        }else if(this.object.formInstanceName != undefined){
          this.isLexEntry = false;
          this.isForm = true;
          this.isSense = false;
        }else if(this.object.senseInstanceName != undefined){
          this.isLexEntry = false;
          this.isForm = false;
          this.isSense = true;
        }
        
      }else {
        this.object = null;
      }
    }, 10);
  }

  onChangeSameAsByInput(value, index){
    if(value.trim() != ''){
      var selectedValues = value;
      var lexicalElementId = '';
      if (this.object.lexicalEntryInstanceName != undefined) {
        lexicalElementId = this.object.lexicalEntryInstanceName;
      } else if (this.object.formInstanceName != undefined) {
        lexicalElementId = this.object.formInstanceName;
      } else if (this.object.senseInstanceName != undefined) {
        lexicalElementId = this.object.senseInstanceName;
      }
  
      //console.log(this.memorySameAs[index])
      if (this.memorySameAs[index] == "") {
        let parameters = {
          type: "reference",
          relation: "sameAs",
          value: selectedValues
        }
        //console.log(parameters)
        this.lexicalService.updateGenericRelation(lexicalElementId, parameters).subscribe(
          data => {
            //console.log(data)
          }, error => {
            //console.log(error)
            this.toastr.error(error.error, 'Error', {
              timeOut: 5000,
            });
          }
        )
  
        this.memorySameAs[index] = selectedValues;
      } else {
        let oldValue = this.memorySameAs[index];
        let parameters = {
          type: "reference",
          relation: "sameAs",
          value: selectedValues,
          currentValue: oldValue
        }
        //console.log(parameters)
        this.lexicalService.updateGenericRelation(lexicalElementId, parameters).subscribe(
          data => {
            //console.log(data)
          }, error => {
            //console.log(error)
            this.toastr.error(error.error, 'Error', {
              timeOut: 5000,
            });
          }
        )
      }
    }
    
  }

  deleteData(){
    this.searchResults = [];
  }

  triggerSameAsInput(evt, i){
    if(evt.target != undefined){
      let value = evt.target.value;
      this.subject_input.next({value, i})
    }
  }

  triggerTooltip() {
    setTimeout(() => {
      //@ts-ignore
      $('.same-as-tooltip').tooltip({
        trigger: 'hover'
      });
    }, 500);
  }

  createSameAsEntry(e?, i?) {
    if(e == undefined){
      return this.formBuilder.group({
        entity: null,
        inferred : false
      })
    }else{
      return this.formBuilder.group({
        entity: e,
        inferred : i
      })
    }
    
  }

  addSameAsEntry(e?, i?) {
    this.sameAsArray = this.sameAsForm.get('sameAsArray') as FormArray;
    if(e == undefined){
      this.sameAsArray.push(this.createSameAsEntry());
    }else{
      this.sameAsArray.push(this.createSameAsEntry(e, i));
    }
    
    this.triggerTooltip();
  }

  removeElement(index) {
    this.sameAsArray = this.sameAsForm.get('sameAsArray') as FormArray;
    const lexical_entity = this.sameAsArray.at(index).get('entity').value;

    if (this.object.lexicalEntryInstanceName != undefined) {

      let lexId = this.object.lexicalEntryInstanceName;

      let parameters = {
        relation: 'sameAs',
        value: lexical_entity
      }

      

      this.lexicalService.deleteLinguisticRelation(lexId, parameters).subscribe(
        data => {
          //console.log(data)
          this.lexicalService.updateLexCard(this.object)
        }, error => {
          //console.log(error)
          this.toastr.error(error.error, 'Error', {
            timeOut: 5000,
          });
        }
      )
    } else if (this.object.formInstanceName != undefined) {
      let formId = this.object.formInstanceName;

      let parameters = {
        relation: 'sameAs',
        value: lexical_entity
      }

      

      this.lexicalService.deleteLinguisticRelation(formId, parameters).subscribe(
        data => {
          //console.log(data)
          this.lexicalService.updateLexCard(this.object)
        }, error => {
          //console.log(error)
        }
      )

    } else if (this.object.senseInstanceName != undefined) {
      let senseId = this.object.senseInstanceName;

      let parameters = {
        type: 'morphology',
        relation: 'sameAs',
        value: lexical_entity
      }

      //console.log(parameters)

      this.lexicalService.deleteLinguisticRelation(senseId, parameters).subscribe(
        data => {
          //console.log(data)
          this.lexicalService.updateLexCard(this.object)
        }, error => {
          //console.log(error)
        }
      )
    }
    this.memorySameAs.splice(index, 1)
    this.sameAsArray.removeAt(index);
  }

}
