/*
  © Copyright 2021-2022  Istituto di Linguistica Computazionale "A. Zampolli", Consiglio Nazionale delle Ricerche, Pisa, Italy.
 
This file is part of EpiLexo.

EpiLexo is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

EpiLexo is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with EpiLexo. If not, see <https://www.gnu.org/licenses/>.
*/

import { Component, Input, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { LexicalEntriesService } from 'src/app/services/lexical-entries/lexical-entries.service';

import { FormBuilder, FormGroup, FormArray, FormControl } from '@angular/forms';
import { debounceTime, pairwise, startWith, takeUntil } from 'rxjs/operators';
import { ConceptService } from 'src/app/services/concept/concept.service';
import { ToastrService } from 'ngx-toastr';
@Component({
  selector: 'app-lexical-concept-form',
  templateUrl: './lexical-concept-form.component.html',
  styleUrls: ['./lexical-concept-form.component.scss']
})
export class LexicalConceptFormComponent implements OnInit, OnDestroy {

  switchInput = false;
  subscription: Subscription;
  object: any;
  peopleLoading = false;
  counter = 0;
  componentRef: any;

  @Input() lexicalConceptData : any;

  lexicalConceptForm = new FormGroup({
    label: new FormControl(''),
    //definition : new FormControl(''),
    /* hierachicalRelation: new FormArray([this.createHierachicalRelation()]),
    scheme: new FormArray([this.createScheme()]),
    conceptReference: new FormArray([this.createConceptReference()]) */
  })

  /* hierachicalRelation: FormArray;
  scheme: FormArray;
  conceptReference: FormArray; */

  destroy$ : Subject<boolean> = new Subject();

  constructor(private lexicalService: LexicalEntriesService, 
              private formBuilder: FormBuilder,
              private conceptService : ConceptService,
              private toastr : ToastrService) {
  }

  ngOnInit() {
    
    this.lexicalConceptForm = this.formBuilder.group({
      defaultLabel: '',
      //definition : '',
      /* hierachicalRelation: this.formBuilder.array([this.createHierachicalRelation()]),
      scheme: this.formBuilder.array([this.createScheme()]),
      conceptReference: this.formBuilder.array([this.createConceptReference()]) */
    })
    this.onChanges();
    this.triggerTooltip();
  }

  ngOnChanges(changes: SimpleChanges) {
    setTimeout(()=> {
      if(this.object != changes.lexicalConceptData.currentValue){
        /* if(this.conceptReference != null){
          this.conceptReference.clear();
          this.hierachicalRelation.clear();
          this.scheme.clear();
        } */
      }
      //this.loadPeople();
      this.object = changes.lexicalConceptData.currentValue;
      if(this.object != null){
        this.lexicalConceptForm.get('defaultLabel').setValue(this.object.defaultLabel, {emitEvent:false});
      }
      this.triggerTooltip();
  }, 10)
  }

  triggerTooltip(){
    setTimeout(() => {
      //@ts-ignore
      $('.vartrans-tooltip').tooltip({
        trigger : 'hover'
      });
    }, 500);
  }

 

  onChanges(): void {
    this.lexicalConceptForm.get('defaultLabel').valueChanges.pipe(debounceTime(1000), startWith(this.lexicalConceptForm.get('defaultLabel').value), pairwise(), takeUntil(this.destroy$)).subscribe(([prev, next]: [any, any]) => {
      if(next != '') {
        let parameters = {
          relation: "http://www.w3.org/2004/02/skos/core#prefLabel",
          source: this.object.lexicalConcept,
          target: next,
          oldTarget: prev == '' ? this.object.defaultLabel : prev,
          targetLanguage: this.object.language,
          oldTargetLanguage : this.object.language
        }


        this.conceptService.updateSkosLabel(parameters).pipe(takeUntil(this.destroy$)).subscribe(
          data=> {
            console.log(data)
          }, error=> {
            console.log(error);
            
            //this.lexicalService.changeDecompLabel(next)
            if (error.status != 200) {
                this.toastr.error(error.error, 'Error', {
                    timeOut: 5000,
                });
            } else {
              const data = this.object;
              data['request'] = 0;
              data['new_label'] = next;
              this.lexicalService.refreshAfterEdit(data);
              this.lexicalService.spinnerAction('off');
              this.lexicalService.updateCoreCard({ lastUpdate: error.error.text });
              this.toastr.success('Label changed correctly for ' + this.object.lexicalConcept, '', {
                  timeOut: 5000,
              });
            }
          }
        )
      }
    })
  }

  /* createScheme(): FormGroup {
    return this.formBuilder.group({
      target: ''
    })
  }

  addScheme() {
    this.scheme = this.lexicalConceptForm.get('scheme') as FormArray;
    this.scheme.push(this.createScheme());
    this.triggerTooltip();
  }

  removeScheme(index) {
    this.scheme = this.lexicalConceptForm.get('scheme') as FormArray;
    this.scheme.removeAt(index);
  }

  addHierachicalRelation() {
    this.hierachicalRelation = this.lexicalConceptForm.get('hierachicalRelation') as FormArray;
    this.hierachicalRelation.push(this.createHierachicalRelation());
    this.triggerTooltip();
  }

  removeHierachicalRelation(index) {
    this.hierachicalRelation = this.lexicalConceptForm.get('hierachicalRelation') as FormArray;
    this.hierachicalRelation.removeAt(index);
  }

  addConceptReference() {
    this.conceptReference = this.lexicalConceptForm.get('conceptReference') as FormArray;
    this.conceptReference.push(this.createConceptReference());
    this.triggerTooltip();
  }

  removeConceptReference(index) {
    this.conceptReference = this.lexicalConceptForm.get('conceptReference') as FormArray;
    this.conceptReference.removeAt(index);
  }


  createHierachicalRelation(): FormGroup {
    return this.formBuilder.group({
      relation: '',
      entity: ''
    })
  }

  createConceptReference(): FormGroup {
    return this.formBuilder.group({
      target: ''
    })
  } */

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.complete();
  }

}

