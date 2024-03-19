/*
  © Copyright 2021-2022  Istituto di Linguistica Computazionale "A. Zampolli", Consiglio Nazionale delle Ricerche, Pisa, Italy.
 
This file is part of EpiLexo.

EpiLexo is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

EpiLexo is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with EpiLexo. If not, see <https://www.gnu.org/licenses/>.
*/

import {
  Component,
  Input,
  OnDestroy,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { LexicalEntriesService } from 'src/app/services/lexical-entries/lexical-entries.service';

import { FormBuilder, FormGroup, FormArray, FormControl } from '@angular/forms';
import { debounceTime, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-sense-vartrans-form',
  templateUrl: './sense-vartrans-form.component.html',
  styleUrls: ['./sense-vartrans-form.component.scss'],
})
export class SenseVartransFormComponent implements OnInit, OnDestroy {
  switchInput = false;
  subscription: Subscription;
  object: any;
  peopleLoading = false;
  counter = 0;
  componentRef: any;

  @Input() senseData: any;

  senseVartransForm = new FormGroup({
    label: new FormControl(''),
    translation: new FormArray([this.createTranslation()]),
    senseTranslation: new FormArray([this.createSenseTranslation()]),
    terminologicalRelation: new FormArray([
      this.createTerminologicalRelation(),
    ]),
  });

  translation: FormArray;
  senseTranslation: FormArray;
  terminologicalRelation: FormArray;
  terminologicalRelationSub: FormArray;
  destroy$: Subject<boolean> = new Subject();
  constructor(
    private lexicalService: LexicalEntriesService,
    private formBuilder: FormBuilder
  ) {}

  ngOnInit() {
    // Inizializza il FormGroup senseVartransForm con i campi label, translation, senseTranslation e terminologicalRelation vuoti
    this.senseVartransForm = this.formBuilder.group({
      label: '',
      translation: this.formBuilder.array([this.createTranslation()]),
      senseTranslation: this.formBuilder.array([this.createSenseTranslation()]),
      terminologicalRelation: this.formBuilder.array([
        this.createTerminologicalRelation(),
      ]),
    });
    // Aggiunge un listener per i cambiamenti nel form
    this.onChanges();
    // Attiva i tooltip
    this.triggerTooltip();
  }

  ngOnChanges(changes: SimpleChanges) {
    // Metodo richiamato quando ci sono cambiamenti nei dati
    setTimeout(() => {
      // Se l'oggetto cambia, pulisci le relazioni terminologiche, le traduzioni del senso e le traduzioni
      if (this.object != changes.senseData.currentValue) {
        if (this.terminologicalRelation != null) {
          this.terminologicalRelation.clear();
          this.senseTranslation.clear();
          this.translation.clear();
        }
      }
      // Aggiorna l'oggetto con il nuovo valore
      this.object = changes.senseData.currentValue;
      // Se l'oggetto non è nullo, imposta il valore del campo 'label' nel form
      if (this.object != null) {
        this.senseVartransForm
          .get('label')
          .setValue(this.object.label, { emitEvent: false });
      }
      // Attiva i tooltip
      this.triggerTooltip();
    }, 10);
  }

  triggerTooltip() {
    // Attiva i tooltip dopo un certo intervallo di tempo
    setTimeout(() => {
      //@ts-ignore
      $('.vartrans-tooltip').tooltip({
        trigger: 'hover',
      });
    }, 500);
  }

  onChanges(): void {
    // Aggiunge un listener per i cambiamenti nei valori del form
    this.senseVartransForm.valueChanges
      .pipe(debounceTime(200), takeUntil(this.destroy$))
      .subscribe((searchParams) => {
        //console.log(searchParams)
      });
  }

  createTranslation(): FormGroup {
    // Crea un FormGroup per una traduzione con campi type, confidence e target
    return this.formBuilder.group({
      type: '',
      confidence: 0.0,
      target: '',
    });
  }

  addTranslation() {
    // Aggiunge un nuovo elemento al FormGroup 'translation'
    this.translation = this.senseVartransForm.get('translation') as FormArray;
    this.translation.push(this.createTranslation());
    // Attiva i tooltip
    this.triggerTooltip();
  }

  removeTranslation(index) {
    // Rimuove un elemento dal FormGroup 'translation' all'indice specificato
    this.translation = this.senseVartransForm.get('translation') as FormArray;
    this.translation.removeAt(index);
  }

  addSenseTranslation() {
    // Aggiunge un nuovo elemento al FormGroup 'senseTranslation'
    this.senseTranslation = this.senseVartransForm.get(
      'senseTranslation'
    ) as FormArray;
    this.senseTranslation.push(this.createSenseTranslation());
    // Attiva i tooltip
    this.triggerTooltip();
  }

  removeSenseTranslation(index) {
    // Rimuove un elemento dal FormGroup 'senseTranslation' all'indice specificato
    this.senseTranslation = this.senseVartransForm.get(
      'senseTranslation'
    ) as FormArray;
    this.senseTranslation.removeAt(index);
  }

  addTerminologicalRelation() {
    // Aggiunge un nuovo elemento al FormGroup 'terminologicalRelation'
    this.terminologicalRelation = this.senseVartransForm.get(
      'terminologicalRelation'
    ) as FormArray;
    this.terminologicalRelation.push(this.createTerminologicalRelation());
    // Attiva i tooltip
    this.triggerTooltip();
  }

  removeTerminologicalRelation(index) {
    // Rimuove un elemento dal FormGroup 'terminologicalRelation' all'indice specificato
    this.terminologicalRelation = this.senseVartransForm.get(
      'terminologicalRelation'
    ) as FormArray;
    this.terminologicalRelation.removeAt(index);
  }

  addTerminologicalRelationSub(index) {
    // Aggiunge un nuovo elemento al FormGroup 'sub_rel' all'interno di 'terminologicalRelation'
    const control = (<FormArray>(
      this.senseVartransForm.controls['terminologicalRelation']
    ))
      .at(index)
      .get('sub_rel') as FormArray;
    control.insert(index, this.createSubTerminologicalRelation());
    // Attiva i tooltip
    this.triggerTooltip();
  }

  removeTerminologicalRelationSub(index, iy) {
    // Rimuove un elemento dal FormGroup 'sub_rel' all'interno di 'terminologicalRelation' all'indice specificato
    const control = (<FormArray>(
      this.senseVartransForm.controls['terminologicalRelation']
    ))
      .at(index)
      .get('sub_rel') as FormArray;
    control.removeAt(iy);
  }

  createSenseTranslation(): FormGroup {
    // Crea un FormGroup per una traduzione del senso con campi relation e entity
    return this.formBuilder.group({
      relation: '',
      entity: '',
    });
  }

  createTerminologicalRelation(): FormGroup {
    // Crea un FormGroup per una relazione terminologica con campi a_entity, relation, b_entity e un FormArray 'sub_rel'
    return this.formBuilder.group({
      a_entity: '',
      relation: '',
      b_entity: '',
      sub_rel: new FormArray([]),
    });
  }

  createSubTerminologicalRelation(): FormGroup {
    // Crea un FormGroup per una sotto-relazione terminologica con campi sub_relation e sub_entity
    return this.formBuilder.group({
      sub_relation: 'eee',
      sub_entity: '',
    });
  }

  ngOnDestroy(): void {
    // Distrugge l'Observable
    this.destroy$.next(true);
    this.destroy$.complete();
  }
}
