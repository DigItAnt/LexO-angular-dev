/*
  © Copyright 2021-2022  Istituto di Linguistica Computazionale "A. Zampolli", Consiglio Nazionale delle Ricerche, Pisa, Italy.
 
This file is part of EpiLexo.

EpiLexo is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

EpiLexo is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with EpiLexo. If not, see <https://www.gnu.org/licenses/>.
*/

import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { LexicalEntriesService } from 'src/app/services/lexical-entries/lexical-entries.service';
import { DataService, Person } from '../../core-tab/lexical-entry-core-form/data.service';

@Component({
  selector: 'app-lexical-entry-decomp-form',
  templateUrl: './lexical-entry-decomp-form.component.html',
  styleUrls: ['./lexical-entry-decomp-form.component.scss']
})
export class LexicalEntryDecompFormComponent implements OnInit {

  @Input() decData: any;

  switchInput = false;
  subscription: Subscription;
  object: any;
  people: Person[] = [];
  peopleLoading = false;
  counter = 0;
  componentRef: any;

  subtermDisabled = false;

  decompForm = new FormGroup({
    label: new FormControl(''),
    component: new FormArray([this.createComponent()]),
    subterm: new FormArray([this.createSubterm()])
  })

  componentArray: FormArray;
  subtermArray: FormArray;

  constructor(private dataService: DataService, private lexicalService: LexicalEntriesService, private formBuilder: FormBuilder) { }

  ngOnInit(): void {

    this.decompForm = this.formBuilder.group({
      label: '',
      component: this.formBuilder.array([]),
      subterm : this.formBuilder.array([]),
    })
    this.onChanges();
    this.loadPeople();
    this.triggerTooltip();
  }

  triggerTooltip() {
    setTimeout(() => {
      //@ts-ignore
      $('.vartrans-tooltip').tooltip({
        trigger: 'hover'
      });
    }, 500);
  }

  ngOnChanges(changes: SimpleChanges) {
    setTimeout(() => {
      if (this.object != changes.decData.currentValue) {
        if (this.componentArray != null || this.subtermArray != null) {
          this.componentArray.clear();
          this.subtermArray.clear();
          this.subtermDisabled = false;
        }
      }
      this.loadPeople();
      this.object = changes.decData.currentValue;
      if (this.object != null) {
        this.decompForm.get('label').setValue(this.object.label, { emitEvent: false });
      }
      this.triggerTooltip();
    }, 10)
  }

  private loadPeople() {
    this.peopleLoading = true;
    this.dataService.getPeople().subscribe(x => {
      this.people = x;
      this.peopleLoading = false;
    });
  }

  onChanges(): void {
    this.decompForm.valueChanges.pipe(debounceTime(200)).subscribe(searchParams => {
      //console.log(searchParams)
    })
  }

  addSubterm() {
    this.subtermArray = this.decompForm.get('subterm') as FormArray;
    this.subtermArray.push(this.createSubterm());
    this.subtermDisabled = true;
   }

  addComponent() { 
    this.componentArray = this.decompForm.get('component') as FormArray;
    this.componentArray.push(this.createComponent());
  }

  removeComponent(index){
    this.componentArray = this.decompForm.get('component') as FormArray;
    this.componentArray.removeAt(index);
  }

  addRelation(index){
    const control = (<FormArray>this.decompForm.controls['component']).at(index).get('relation') as FormArray;
    control.push(this.createRelation());
  }

  removeRelation(ix, iy){
    const control = (<FormArray>this.decompForm.controls['component']).at(ix).get('relation') as FormArray;
    control.removeAt(iy);
  }

  addSubtermElement(index){
    const control = (<FormArray>this.decompForm.controls['subterm']).at(index).get('subterm_array') as FormArray;
    control.push(this.createSubtermComponent());
  }

  removeSubtermElement(ix, iy){
    const control = (<FormArray>this.decompForm.controls['subterm']).at(ix).get('subterm_array') as FormArray;
    control.removeAt(iy);
  }

  removeSubterm(index){
    this.componentArray = this.decompForm.get('subterm') as FormArray;
    this.componentArray.removeAt(index);
    this.subtermDisabled = false;
  }

  createRelation(){
    return this.formBuilder.group({
      trait: '',
      value: ''
    })
  }

  removeSubtermComponent(ix, iy){
    const control = (<FormArray>this.decompForm.controls['component']).at(ix).get('sub_term') as FormArray;
    control.removeAt(iy);
  }

  removeCorrespondsToComponent(ix, iy){
    const control = (<FormArray>this.decompForm.controls['component']).at(ix).get('corresponds_to') as FormArray;
    control.removeAt(iy);
  }

  createComponent() {
    return this.formBuilder.group({
      sub_term: new FormArray([this.createSubtermComponent()]),
      corresponds_to: new FormArray([this.createSubtermComponent()]),
      relation: new FormArray([])
    })
  }

  createSubtermComponent() {
    return this.formBuilder.group({
      entity: ''
    })
  }

  createSubterm() {
    return this.formBuilder.group({
      subterm_array : new FormArray([this.createSubtermComponent()])
    })
  }

}
