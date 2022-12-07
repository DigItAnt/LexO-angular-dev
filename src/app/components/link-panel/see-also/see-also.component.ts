﻿/*
  © Copyright 2021-2022  Istituto di Linguistica Computazionale "A. Zampolli", Consiglio Nazionale delle Ricerche, Pisa, Italy.
 
This file is part of EpiLexo.

EpiLexo is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

EpiLexo is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with EpiLexo. If not, see <https://www.gnu.org/licenses/>.
*/

import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { LexicalEntriesService } from 'src/app/services/lexical-entries/lexical-entries.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-see-also',
  templateUrl: './see-also.component.html',
  styleUrls: ['./see-also.component.scss']
})
export class SeeAlsoComponent implements OnInit, OnDestroy {

  @Input() seeAlsoData: any[] | any;

  private subject: Subject<any> = new Subject();
  private subject_input: Subject<any> = new Subject();

  subscription: Subscription;
  object: any;
  peopleLoading = false;

  isSense;
  isForm;
  isLexEntry;

  searchResults: [];
  memorySeeAlso = [];
  filterLoading = false;

  seeAlsoForm = new FormGroup({
    seeAlsoArray: new FormArray([this.createSeeAlsoEntry()])
  })

  seeAlsoArray: FormArray;

  search_filter_subscriber : Subscription;
  search_by_input_subscriber : Subscription;

  constructor(private formBuilder: FormBuilder, private lexicalService: LexicalEntriesService, private toastr: ToastrService) {
  }

  ngOnInit() {
    this.seeAlsoForm = this.formBuilder.group({
      seeAlsoArray: this.formBuilder.array([])
    })

    this.onChanges();
    /* //console.log(this.seeAlsoForm) */
    this.search_filter_subscriber = this.subject.pipe(debounceTime(1000), takeUntil(this.destroy$)).subscribe(
      data => {
        console.log(data)
        this.onSearchFilter(data)
      }
    )

    this.search_by_input_subscriber = this.subject_input.pipe(debounceTime(1000), takeUntil(this.destroy$)).subscribe(
      data => {
        this.onChangeSeeAlsoByInput(data['value'], data['i'])
      }
    )
    this.triggerTooltip();
  }


  triggerTooltip() {
    setTimeout(() => {
      //@ts-ignore
      $('.see-also-tooltip').tooltip({
        trigger: 'hover'
      });
    }, 500);
  }

  ngOnChanges(changes: SimpleChanges) {
    setTimeout(() => {
      if (changes.seeAlsoData.currentValue != null) {
        this.object = changes.seeAlsoData.currentValue;
        this.seeAlsoArray = this.seeAlsoForm.get('seeAlsoArray') as FormArray;
        this.seeAlsoArray.clear();
        this.memorySeeAlso = [];

        //console.log(this.object)

        this.object.array.forEach(element => {
          if(element.label != ''){
            this.addSeeAlsoEntry(element.label, element.inferred, element.lexicalEntityInstanceName, element.linkType)
            this.memorySeeAlso.push(element.lexicalEntityInstanceName)
          }else{
            this.addSeeAlsoEntry(element.lexicalEntity, element.inferred, element.lexicalEntityInstanceName, element.linkType)
            this.memorySeeAlso.push(element.lexicalEntity)
          }
          
          
        });

        if (this.object.lexicalEntryInstanceName != undefined) {
          this.isLexEntry = true;
          this.isForm = false;
          this.isSense = false;
        } else if (this.object.formInstanceName != undefined) {
          this.isLexEntry = false;
          this.isForm = true;
          this.isSense = false;
        } else if (this.object.senseInstanceName != undefined) {
          this.isLexEntry = false;
          this.isForm = false;
          this.isSense = true;
        }

      } else {
        this.object = null;
      }
    }, 10);

  }

  async onChangeSeeAlsoByInput(value, index) {

    if(value.trim() != ""){
      var selectedValues = value;
      var lexicalElementId = '';
      if (this.object.lexicalEntryInstanceName != undefined) {
        lexicalElementId = this.object.lexicalEntryInstanceName;
      } else if (this.object.formInstanceName != undefined) {
        lexicalElementId = this.object.formInstanceName;
      } else if (this.object.senseInstanceName != undefined) {
        lexicalElementId = this.object.senseInstanceName;
      }else if (this.object.etymologyInstanceName != undefined) {
        lexicalElementId = this.object.etymologyInstanceName;
      }

      console.log(this.object)
  
      if (this.memorySeeAlso[index] == "" || this.memorySeeAlso[index] == undefined) {
        let parameters = {
          type: "reference",
          relation: "seeAlso",
          value: selectedValues
        }
        try{
          let data = await this.lexicalService.updateGenericRelation(lexicalElementId, parameters).toPromise();
        }catch(e){
          console.log(e)
          if(e.status == 200){
            this.memorySeeAlso.push(selectedValues)
            this.toastr.success('SeeAlso updated', '', {
              timeOut: 5000,
            });
          }else{
            this.toastr.error(e.error, 'Error', {
              timeOut: 5000,
            });
          }
        }
      } else {
        let oldValue = this.memorySeeAlso[index];
        let parameters = {
          type: "reference",
          relation: "seeAlso",
          value: selectedValues,
          currentValue: oldValue
        }
        console.log(parameters)
        try{
          let data = await this.lexicalService.updateGenericRelation(lexicalElementId, parameters).toPromise();
        }catch(e){
          if(e.status == 200){
            this.memorySeeAlso.push(selectedValues)
            this.toastr.success('SeeAlso updated', '', {
              timeOut: 5000,
            });
          }else{
            this.toastr.error(e.error, 'Error', {
              timeOut: 5000,
            });
          }
        }
        
      }
    }
    

  }

  async onChangeSeeAlso(seeAlso, index) {
    //console.log(seeAlso.selectedItems)
    if (seeAlso.selectedItems.length != 0) {
      var selectedValues = seeAlso.selectedItems[0].value.lexicalEntryInstanceName;
      var lexicalElementId = '';
      if (this.object.lexicalEntryInstanceName != undefined) {
        lexicalElementId = this.object.lexicalEntryInstanceName;
      } else if (this.object.formInstanceName != undefined) {
        lexicalElementId = this.object.formInstanceName;
      } else if (this.object.senseInstanceName != undefined) {
        lexicalElementId = this.object.senseInstanceName;
      }else if (this.object.etymologyInstanceName != undefined) {
        lexicalElementId = this.object.etymologyInstanceName;
      }

      if (this.memorySeeAlso[index] == undefined) {
        let parameters = {
          type: "reference",
          relation: "seeAlso",
          value: selectedValues
        }
        console.log(parameters)

        try{
          let data = await this.lexicalService.updateGenericRelation(lexicalElementId, parameters).toPromise();
        }catch(e){
          if(e.status == 200){
            this.memorySeeAlso[index] = selectedValues
            this.lexicalService.refreshLinkCounter('+1')
            this.toastr.success('SeeAlso updated', '', {
              timeOut: 5000,
            });
          }else{
            this.toastr.error(e.error, 'Error', {
              timeOut: 5000,
            });
          }
        }
        
      } else {
        let oldValue = this.memorySeeAlso[index];
        let parameters = {
          type: "reference",
          relation: "seeAlso",
          value: selectedValues,
          currentValue: oldValue
        }
        console.log(parameters)
        try{
          let data = await this.lexicalService.updateGenericRelation(lexicalElementId, parameters).toPromise();
        }catch(e){
          if(e.status == 200){
            this.memorySeeAlso[index] = selectedValues
            this.lexicalService.refreshLinkCounter('+1')
            this.toastr.success('SeeAlso updated', '', {
              timeOut: 5000,
            });
          }else{
            this.toastr.error(e.error, 'Error', {
              timeOut: 5000,
            });
          }
        }
       
      }

    }


  }

  deleteData() {
    this.searchResults = [];
  }



  async onSearchFilter(data) {
    this.filterLoading = true;
    this.searchResults = [];
    console.log(this.object)
    if (this.object.lexicalEntryInstanceName != undefined) {
      let parameters = {
        text: data,
        searchMode: "startsWith",
        type: "",
        pos: "",
        formType: "entry",
        author: "",
        lang: "",
        status: "",
        offset: 0,
        limit: 500
      }
      //console.log(data.length)
      
      let lexical_entries_list = await this.lexicalService.getLexicalEntriesList(parameters).toPromise();
      if(lexical_entries_list){
        this.searchResults = lexical_entries_list['list']
        this.filterLoading = false;
      }else{
        this.filterLoading = false;
      }
      
      
    } else if (this.object.formInstanceName != undefined) {
      let lexId = this.object.parentInstanceName;
      let parameters = {
        text: data,
        searchMode: "startsWith",
        representationType: "writtenRep",
        author: "",
        offset: 0,
        limit: 500
      }
      let form_list = await this.lexicalService.getFormList(parameters).toPromise();
      if(form_list){
        this.searchResults = form_list['list']
        this.filterLoading = false;
      }else{
        this.filterLoading = false;
      }
    } else if (this.object.senseInstanceName != undefined) {

      let parameters = {
        text: data,
        searchMode: "startsWith",
        type: "",
        pos: "",
        formType: "entry",
        author: "",
        lang: "",
        status: "",
        offset: 0,
        limit: 500
      }

      let lexical_entries_list = await this.lexicalService.getLexicalEntriesList(parameters).toPromise();
      if(lexical_entries_list){
        this.searchResults = lexical_entries_list['list']
        this.filterLoading = false;
      }else{
        this.filterLoading = false;
      }

    } else if (this.object.etymologyInstanceName != undefined) {

      let parameters = {
        text: data,
        searchMode: "startsWith",
        type: "etymon",
        pos: "",
        formType: "entry",
        author: "",
        lang: "",
        status: "",
        offset: 0,
        limit: 500
      }
      let lexical_entries_list = await this.lexicalService.getLexicalEntriesList(parameters).toPromise();
      if(lexical_entries_list){
        this.searchResults = lexical_entries_list['list']
        this.filterLoading = false;
      }else{
        this.filterLoading = false;
      }
    }
    else {
      this.filterLoading = false;
    }
    //console.log(data)

  }

  triggerSeeAlsoInput(evt, i) {
    if (evt.key != 'Control' && evt.key != 'Shift' && evt.key != 'Alt') {
      let value = evt.target.value;
      this.subject_input.next({ value, i })
    }
  }

  triggerSeeAlso(evt) {
    if (evt.target != undefined) {
      this.subject.next(evt.target.value)
    }

  }
  onChanges(): void {
    this.seeAlsoForm.valueChanges.pipe(debounceTime(200), takeUntil(this.destroy$)).subscribe(searchParams => {
      //console.log(searchParams)
    })
  }

  createSeeAlsoEntry(e?, i?, le?, lt?) {
    if (e == undefined) {
      return this.formBuilder.group({
        entity: null,
        inferred: false,
        lexical_entity: null,
        link_type : 'internal'
      })
    } else {
      return this.formBuilder.group({
        entity: e,
        inferred: i,
        lexical_entity: le,
        link_type : lt
      })
    }

  }

  addSeeAlsoEntry(e?, i?, le?, lt?) {
    this.seeAlsoArray = this.seeAlsoForm.get('seeAlsoArray') as FormArray;

    if (e == undefined) {
      this.seeAlsoArray.push(this.createSeeAlsoEntry());
    } else {
      this.seeAlsoArray.push(this.createSeeAlsoEntry(e, i, le, lt));
    }

    
    this.triggerTooltip();
  }

  async removeElement(index) {
    this.seeAlsoArray = this.seeAlsoForm.get('seeAlsoArray') as FormArray;

    let lexical_entity = this.seeAlsoArray.at(index).get('lexical_entity').value;
    //console.log('Lexical Entity: '+lexical_entity)
    if(lexical_entity == '' || lexical_entity == null){
      lexical_entity = this.seeAlsoArray.at(index).get('entity').value;
      //console.log('Entity: '+lexical_entity)
    }

    if (this.object.lexicalEntryInstanceName != undefined) {

      let lexId = this.object.lexicalEntryInstanceName;

      let parameters = {
        relation: 'seeAlso',
        value: lexical_entity
      }

      //console.log(parameters)
      //console.log(index)
      try{
        let delete_see_also = await this.lexicalService.deleteLinguisticRelation(lexId, parameters).toPromise();

        
        this.lexicalService.updateCoreCard(this.object)
        this.toastr.success('SeeAlso deleted', '', {
          timeOut: 5000,
        });
        this.lexicalService.refreshLinkCounter('-1')
        
      }catch(e){
        this.toastr.error(e.error, 'Error', {
          timeOut: 5000,
        });
        this.lexicalService.refreshLinkCounter('-1')

      }
      
      
    } else if (this.object.formInstanceName != undefined) {
      let formId = this.object.formInstanceName;

      let parameters = {
        relation: 'seeAlso',
        value: lexical_entity
      }

      try{
        let delete_see_also = await this.lexicalService.deleteLinguisticRelation(formId, parameters).toPromise();
        this.lexicalService.updateCoreCard(this.object)
        this.toastr.success('SeeAlso deleted', '', {
          timeOut: 5000,
        });
        this.lexicalService.refreshLinkCounter('-1')
        
      }catch(e){
        this.toastr.error(e.error, 'Error', {
          timeOut: 5000,
        });
        this.lexicalService.refreshLinkCounter('-1')
      }
    

    } else if (this.object.senseInstanceName != undefined) {
      let senseId = this.object.senseInstanceName;

      let parameters = {
        type: 'morphology',
        relation: 'seeAlso',
        value: lexical_entity
      }

      //console.log(parameters)

      try{
        let delete_see_also = await this.lexicalService.deleteLinguisticRelation(senseId, parameters).toPromise();

        this.lexicalService.updateCoreCard(this.object)
        this.toastr.success('SeeAlso deleted', '', {
          timeOut: 5000,
        });
        this.lexicalService.refreshLinkCounter('-1')
        
      }catch(e){
        this.toastr.error(e.error, 'Error', {
          timeOut: 5000,
        });
        this.lexicalService.refreshLinkCounter('-1')
      }
    } else if (this.object.etymologyInstanceName != undefined) {
      let etymId = this.object.etymologyInstanceName;
      this.lexicalService.refreshLinkCounter('-1')

      let parameters = {
        type: 'morphology',
        relation: 'seeAlso',
        value: lexical_entity
      }

      //console.log(parameters)

      try{
        let delete_see_also = await this.lexicalService.deleteLinguisticRelation(etymId, parameters).toPromise();

        this.lexicalService.updateCoreCard(this.object)
        this.toastr.success('SeeAlso deleted', '', {
          timeOut: 5000,
        });
        this.lexicalService.refreshLinkCounter('-1')
        
      }catch(e){
        this.toastr.error(e.error, 'Error', {
          timeOut: 5000,
        });
        this.lexicalService.refreshLinkCounter('-1')
      }
    }
    this.memorySeeAlso.splice(index, 1)
    this.seeAlsoArray.removeAt(index);

  }

  ngOnDestroy(): void {
      this.search_filter_subscriber.unsubscribe();
      this.search_by_input_subscriber.unsubscribe();
  }

}
