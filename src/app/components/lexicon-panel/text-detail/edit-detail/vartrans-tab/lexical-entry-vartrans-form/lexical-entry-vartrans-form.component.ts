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
  selector: 'app-lexical-entry-vartrans-form',
  templateUrl: './lexical-entry-vartrans-form.component.html',
  styleUrls: ['./lexical-entry-vartrans-form.component.scss'],
})
export class LexicalEntryVartransFormComponent implements OnInit, OnDestroy {
  switchInput = false;
  subscription: Subscription;
  object: any;
  peopleLoading = false;
  counter = 0;
  componentRef: any;

  destroy$: Subject<boolean> = new Subject();

  @Input() lexData: any;

  vartransForm = new FormGroup({
    label: new FormControl(''),
    translatableAs: new FormArray([this.createTranslatableAs()]),
    lexicalRelationDirect: new FormArray([this.createLexicalRelationDirect()]),
    lexicalRelationIndirect: new FormArray([
      this.createLexicalRelationIndirect(),
    ]),
  });

  translatableAs: FormArray;
  lexicalRelationDirect: FormArray;
  lexicalRelationIndirect: FormArray;
  lexicalRelationIndirectSub: FormArray;

  constructor(
    private lexicalService: LexicalEntriesService,
    private formBuilder: FormBuilder
  ) {}

  /**
   * Metodo del ciclo di vita del componente che viene eseguito dopo che Angular ha inizializzato le proprietà del componente.
   * Inizializza il form e i controlli del form.
   */
  ngOnInit() {
    // Inizializzazione del form
    this.vartransForm = this.formBuilder.group({
      label: '',
      translatableAs: this.formBuilder.array([this.createTranslatableAs()]),
      lexicalRelationDirect: this.formBuilder.array([
        this.createLexicalRelationDirect(),
      ]),
      lexicalRelationIndirect: this.formBuilder.array([]),
    });
    // Registra gli eventi sul form
    this.onChanges();
    // Attiva il tooltip
    this.triggerTooltip();
  }

  /**
   * Metodo del ciclo di vita del componente che viene eseguito quando una delle proprietà di input cambia.
   * Aggiorna il form quando i dati vengono modificati esternamente.
   * @param changes Oggetti che contengono il valore corrente e precedente delle proprietà di input che sono cambiate.
   */
  ngOnChanges(changes: SimpleChanges) {
    setTimeout(() => {
      // Controlla se l'oggetto è cambiato
      if (this.object != changes.lexData.currentValue) {
        // Se il campo lexicalRelationIndirect non è nullo, lo cancella
        if (this.lexicalRelationIndirect != null) {
          this.lexicalRelationIndirect.clear();
        }
      }
      // Aggiorna l'oggetto con il nuovo valore
      this.object = changes.lexData.currentValue;
      // Se l'oggetto non è nullo, imposta il valore del campo 'label' nel form e aggiunge le relazioni indirette lessicali
      if (this.object != null) {
        this.vartransForm
          .get('label')
          .setValue(this.object.label, { emitEvent: false });
        this.addLexicalRelationIndirect();
      }
      // Attiva il tooltip
      this.triggerTooltip();
    }, 10);
  }

  /**
   * Attiva il tooltip dopo un ritardo di 500 ms.
   */
  triggerTooltip() {
    setTimeout(() => {
      // Attiva il tooltip utilizzando jQuery
      //@ts-ignore
      $('.vartrans-tooltip').tooltip({
        trigger: 'hover',
      });
    }, 500);
  }

  /**
   * Registra le modifiche sul form e le gestisce tramite observable.
   */
  onChanges(): void {
    this.vartransForm.valueChanges
      .pipe(debounceTime(200), takeUntil(this.destroy$))
      .subscribe((searchParams) => {
        /* //console.log(searchParams) */
      });
  }

  /**
   * Crea un nuovo FormGroup per le entità traducibili.
   * @returns Un nuovo FormGroup per le entità traducibili.
   */
  createTranslatableAs(): FormGroup {
    return this.formBuilder.group({
      entity: '',
    });
  }

  /**
   * Aggiunge un nuovo campo per le entità traducibili al form.
   */
  addTranslatableAs() {
    this.translatableAs = this.vartransForm.get('translatableAs') as FormArray;
    this.translatableAs.push(this.createTranslatableAs());
    // Attiva il tooltip
    this.triggerTooltip();
  }

  /**
   * Rimuove un campo per le entità traducibili dal form.
   * @param index L'indice del campo da rimuovere.
   */
  removeTranslatableAs(index) {
    this.translatableAs = this.vartransForm.get('translatableAs') as FormArray;
    this.translatableAs.removeAt(index);
  }

  /**
   * Aggiunge un nuovo campo per le relazioni lessicali dirette al form.
   */
  addLexicalRelationDirect() {
    this.lexicalRelationDirect = this.vartransForm.get(
      'lexicalRelationDirect'
    ) as FormArray;
    this.lexicalRelationDirect.push(this.createLexicalRelationDirect());
    // Attiva il tooltip
    this.triggerTooltip();
  }

  /**
   * Rimuove un campo per le relazioni lessicali dirette dal form.
   * @param index L'indice del campo da rimuovere.
   */
  removeLexicalRelationDirect(index) {
    this.lexicalRelationDirect = this.vartransForm.get(
      'lexicalRelationDirect'
    ) as FormArray;
    this.lexicalRelationDirect.removeAt(index);
  }

  /**
   * Aggiunge un nuovo campo per le relazioni lessicali indirette al form.
   */
  addLexicalRelationIndirect() {
    this.lexicalRelationIndirect = this.vartransForm.get(
      'lexicalRelationIndirect'
    ) as FormArray;
    this.lexicalRelationIndirect.push(this.createLexicalRelationIndirect());
    // Attiva il tooltip
    this.triggerTooltip();
  }

  /**
   * Rimuove un campo per le relazioni lessicali indirette dal form.
   * @param index L'indice del campo da rimuovere.
   */
  removeLexicalRelationIndirect(index) {
    this.lexicalRelationIndirect = this.vartransForm.get(
      'lexicalRelationIndirect'
    ) as FormArray;
    this.lexicalRelationIndirect.removeAt(index);
  }

  /**
   * Aggiunge un nuovo campo per le relazioni lessicali indirette secondarie al form.
   * @param index L'indice del campo principale a cui aggiungere la relazione secondaria.
   */
  addLexicalRelationIndirectSub(index) {
    const control = (<FormArray>(
      this.vartransForm.controls['lexicalRelationIndirect']
    ))
      .at(index)
      .get('sub_rel') as FormArray;
    control.insert(index, this.createSubLexicalRelationIndirect());
    // Attiva il tooltip
    this.triggerTooltip();
  }

  /**
   * Rimuove un campo per le relazioni lessicali indirette secondarie dal form.
   * @param index L'indice del campo principale da cui rimuovere la relazione secondaria.
   * @param iy L'indice della relazione secondaria da rimuovere.
   */
  removeLexicalRelationIndirectSub(index, iy) {
    const control = (<FormArray>(
      this.vartransForm.controls['lexicalRelationIndirect']
    ))
      .at(index)
      .get('sub_rel') as FormArray;
    control.removeAt(iy);
  }

  /**
   * Crea un nuovo FormGroup per le relazioni lessicali dirette.
   * @returns Un nuovo FormGroup per le relazioni lessicali dirette.
   */
  createLexicalRelationDirect(): FormGroup {
    return this.formBuilder.group({
      relation: '',
      entity: '',
    });
  }

  /**
   * Crea un nuovo FormGroup per le relazioni lessicali indirette.
   * @returns Un nuovo FormGroup per le relazioni lessicali indirette.
   */
  createLexicalRelationIndirect(): FormGroup {
    return this.formBuilder.group({
      a_entity: '',
      relation: '',
      b_entity: '',
      sub_rel: new FormArray([]),
    });
  }

  /**
   * Crea un nuovo FormGroup per le relazioni lessicali indirette secondarie.
   * @returns Un nuovo FormGroup per le relazioni lessicali indirette secondarie.
   */
  createSubLexicalRelationIndirect(): FormGroup {
    return this.formBuilder.group({
      sub_relation: 'eee',
      sub_entity: '',
    });
  }

  /**
   * Metodo del ciclo di vita del componente che viene eseguito quando il componente viene distrutto.
   * Pulisce le risorse.
   */
  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.complete();
  }
}
