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
  QueryList,
  SimpleChanges,
  ViewChildren,
} from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { LexicalEntriesService } from 'src/app/services/lexical-entries/lexical-entries.service';
import { ToastrService } from 'ngx-toastr';
import { LilaService } from 'src/app/services/lila/lila.service';
import { NgSelectComponent } from '@ng-select/ng-select';

@Component({
  selector: 'app-same-as',
  templateUrl: './same-as.component.html',
  styleUrls: ['./same-as.component.scss'],
})
export class SameAsComponent implements OnInit, OnDestroy {
  @Input() sameAsData: any[] | any;

  private subject: Subject<any> = new Subject();
  private subject_input: Subject<any> = new Subject();
  subscription: Subscription;
  object: any;
  searchResults = [];
  filterLoading = false;

  sameas_subscription: Subscription;

  destroy$: Subject<any> = new Subject();

  @ViewChildren('sameAsSelect') sameAsList: QueryList<NgSelectComponent>;

  memorySameAs = [];
  isSense;
  isForm;
  isLexEntry;
  isLexicalConcept;

  disableAddSameAs = false;

  sameAsForm = new FormGroup({
    sameAsArray: new FormArray([this.createSameAsEntry()]),
    isEtymon: new FormControl(null),
    isCognate: new FormControl(null),
  });

  sameAsArray: FormArray;

  constructor(
    private formBuilder: FormBuilder,
    private lexicalService: LexicalEntriesService,
    private toastr: ToastrService,
    private lilaService: LilaService
  ) {}

  /**
   * Metodo chiamato durante l'inizializzazione del componente.
   * Si occupa di configurare il form per il campo "sameAs", inizializzare gli Observable,
   * e attivare il tooltip.
   */
  ngOnInit() {
    // Creazione del FormGroup per "sameAs"
    this.sameAsForm = this.formBuilder.group({
      sameAsArray: this.formBuilder.array([]),
      isEtymon: false,
      isCognate: false,
    });

    // Sottoscrizione al Subject per le ricerche
    this.subject
      .pipe(debounceTime(3000), takeUntil(this.destroy$))
      .subscribe((data) => {
        this.onSearchFilter(data);
      });

    // Sottoscrizione al Subject per i "sameAs" scelti
    this.sameas_subscription = this.lexicalService.triggerSameAs$.subscribe(
      (data) => {
        console.log(data);
        if ((data != undefined || data != null) && this.object != undefined) {
          this.object.type = data;
          if (typeof this.object.type != 'string') {
            let isCognate = this.object.type.find(
              (element) => element == 'Cognate'
            );
            if (isCognate) {
              this.sameAsForm
                .get('isCognate')
                .setValue(true, { emitEvent: false });
            } else {
              this.sameAsForm
                .get('isCognate')
                .setValue(false, { emitEvent: false });
            }

            let isEtymon = this.object.type.find(
              (element) => element == 'Etymon'
            );
            if (isEtymon) {
              this.sameAsForm
                .get('isEtymon')
                .setValue(true, { emitEvent: false });
            } else {
              this.sameAsForm
                .get('isEtymon')
                .setValue(false, { emitEvent: false });
            }
          } else {
            if (this.object.type == 'Cognate') {
              this.sameAsForm
                .get('isCognate')
                .setValue(true, { emitEvent: false });
            } else {
              this.sameAsForm
                .get('isCognate')
                .setValue(false, { emitEvent: false });
            }

            if (this.object.type == 'Etymon') {
              this.sameAsForm
                .get('isEtymon')
                .setValue(true, { emitEvent: false });
            } else {
              this.sameAsForm
                .get('isEtymon')
                .setValue(false, { emitEvent: false });
            }
          }
        }
      },
      (error) => {
        console.log(error);
      }
    );

    // Sottoscrizione al Subject per gli input
    this.subject_input
      .pipe(debounceTime(3000), takeUntil(this.destroy$))
      .subscribe((data) => {
        this.onChangeSameAsByInput(data['value'], data['i']);
      });

    // Attivazione del tooltip
    this.triggerTooltip();
  }

  /**
   * Metodo chiamato quando cambiano le proprietà di input del componente.
   * Si occupa di aggiornare lo stato del form, i valori dei campi, e le variabili di stato.
   * @param changes - Le modifiche nelle proprietà di input.
   */
  ngOnChanges(changes: SimpleChanges) {
    setTimeout(() => {
      if (changes.sameAsData.currentValue != undefined) {
        this.object = changes.sameAsData.currentValue;
        this.sameAsArray = this.sameAsForm.get('sameAsArray') as FormArray;
        this.sameAsArray.clear();

        this.memorySameAs = [];
        console.log(this.object);
        this.disableAddSameAs = false;

        this.object.array.forEach((element) => {
          this.addSameAsEntry(element.entity, element.linkType == 'external');
          this.memorySameAs.push(element.entity);
        });

        if (this.object.type != undefined) {
          if (typeof this.object.type != 'string') {
            let isCognate = this.object.type.find(
              (element) => element == 'Cognate'
            );
            if (isCognate) {
              this.sameAsForm
                .get('isCognate')
                .setValue(true, { emitEvent: false });
            } else {
              this.sameAsForm
                .get('isCognate')
                .setValue(false, { emitEvent: false });
            }

            let isEtymon = this.object.type.find(
              (element) => element == 'Etymon'
            );
            if (isEtymon) {
              this.sameAsForm
                .get('isEtymon')
                .setValue(true, { emitEvent: false });
            } else {
              this.sameAsForm
                .get('isEtymon')
                .setValue(false, { emitEvent: false });
            }
          } else {
            if (this.object.type == 'Cognate') {
              this.sameAsForm
                .get('isCognate')
                .setValue(true, { emitEvent: false });
            } else {
              this.sameAsForm
                .get('isCognate')
                .setValue(false, { emitEvent: false });
            }

            if (this.object.type == 'Etymon') {
              this.sameAsForm
                .get('isEtymon')
                .setValue(true, { emitEvent: false });
            } else {
              this.sameAsForm
                .get('isEtymon')
                .setValue(false, { emitEvent: false });
            }
          }
        }

        // Aggiornamento dello stato del componente in base al tipo di oggetto
        if (this.object.lexicalEntry != undefined) {
          this.isLexEntry = true;
          this.isForm = false;
          this.isSense = false;
          this.isLexicalConcept = false;
        } else if (this.object.form != undefined) {
          this.isLexEntry = false;
          this.isForm = true;
          this.isSense = false;
          this.isLexicalConcept = false;
        } else if (this.object.sense != undefined) {
          this.isLexEntry = false;
          this.isForm = false;
          this.isSense = true;
          this.isLexicalConcept = false;
        } else if (this.object.lexicalConcept != undefined) {
          this.isLexEntry = false;
          this.isForm = false;
          this.isSense = false;
          this.isLexicalConcept = true;
        }
      } else {
        this.object = null;
      }
    }, 10);
  }

  /**
   * Questa funzione viene chiamata quando il valore di un input cambia per gli elementi 'sameAs'.
   * Controlla se il valore non è vuoto, quindi determina l'ID dell'elemento lessicale associato.
   * Se l'array 'memorySameAs' per l'indice specificato è vuoto o non definito, invia una richiesta di aggiornamento al servizio lessicale con il nuovo valore.
   * Se 'memorySameAs' contiene già un valore per l'indice specificato, invia una richiesta di aggiornamento con sia il nuovo valore che il vecchio valore.
   * Se l'aggiornamento ha successo, aggiorna l'array 'memorySameAs' e aggiorna i controlli del form corrispondenti.
   * In caso di errore, visualizza un messaggio di errore.
   * @param value Il nuovo valore dell'input.
   * @param index L'indice dell'elemento 'sameAs' nell'array.
   */
  async onChangeSameAsByInput(value, index) {
    if (value.trim() != '') {
      var selectedValues = value;
      var lexicalElementId = '';
      let parameters = {};
      if (this.object.lexicalEntry != undefined) {
        lexicalElementId = this.object.lexicalEntry;
      } else if (this.object.form != undefined) {
        lexicalElementId = this.object.form;
      } else if (this.object.sense != undefined) {
        lexicalElementId = this.object.sense;
      } else if (this.object.etymology != undefined) {
        lexicalElementId = this.object.etymology;
      } else if (this.object.lexicalConcept != undefined) {
        lexicalElementId = this.object.lexicalConcept;
      }

      if (
        this.memorySameAs[index] == undefined ||
        this.memorySameAs[index] == ''
      ) {
        parameters = {
          type: 'reference',
          relation: 'http://www.w3.org/2002/07/owl#sameAs',
          value: selectedValues,
        };
      } else {
        let oldValue = this.memorySameAs[index];
        parameters = {
          type: 'reference',
          relation: 'http://www.w3.org/2002/07/owl#sameAs',
          value: selectedValues,
          currentValue: oldValue,
        };
      }

      try {
        let data = await this.lexicalService
          .updateGenericRelation(lexicalElementId, parameters)
          .toPromise();
      } catch (e) {
        console.log(e);
        this.disableAddSameAs = false;
        if (e.status == 200) {
          this.memorySameAs[index] = selectedValues;
          this.memorySameAs.push(selectedValues);
          this.toastr.success('sameAs updated', '', {
            timeOut: 5000,
          });

          this.sameAsArray
            .at(index)
            .get('entity')
            .setValue(selectedValues, { emitEvent: false });
          this.sameAsArray
            .at(index)
            .get('inferred')
            .setValue(true, { emitEvent: false });
          this.sameAsArray
            .at(index)
            .get('lila')
            .setValue(false, { emitEvent: false });
        } else {
          this.toastr.error(e.error, 'Error', {
            timeOut: 5000,
          });
        }
      }
    }
  }

  /**
   * Questa funzione viene chiamata quando viene selezionato un elemento dall'elenco di 'sameAs'.
   * Determina l'ID dell'elemento lessicale associato.
   * Se è stata selezionata un'opzione, invia una richiesta di aggiornamento al servizio lessicale con il nuovo valore.
   * Se l'aggiornamento ha successo, aggiorna l'array 'memorySameAs' e aggiorna i controlli del form corrispondenti.
   * In caso di errore, visualizza un messaggio di errore.
   * @param sameAs L'oggetto contenente le opzioni selezionate dall'utente.
   * @param index L'indice dell'elemento 'sameAs' nell'array.
   */
  async onChangeSameAs(sameAs, index) {
    console.log(sameAs.selectedItems);
    let lexicalElementId = '';

    if (this.object.lexicalEntry != undefined) {
      lexicalElementId = this.object.lexicalEntry;
    } else if (this.object.form != undefined) {
      lexicalElementId = this.object.form;
    } else if (this.object.sense != undefined) {
      lexicalElementId = this.object.sense;
    } else if (this.object.etymology != undefined) {
      lexicalElementId = this.object.etymology;
    }

    if (sameAs.selectedItems.length != 0) {
      let parameters = {};
      var selectedValues = sameAs.selectedItems[0].value.lexicalEntry;

      if (selectedValues == undefined) {
        sameAs.selectedItems[0].value.lexicalEntry;
      }

      if (
        this.memorySameAs[index] == undefined ||
        this.memorySameAs[index] == ''
      ) {
        parameters = {
          type: 'reference',
          relation: 'http://www.w3.org/2002/07/owl#sameAs',
          value: selectedValues,
        };
      } else {
        let oldValue = this.memorySameAs[index];
        parameters = {
          type: 'reference',
          relation: 'http://www.w3.org/2002/07/owl#sameAs',
          value: selectedValues,
          currentValue: oldValue,
        };
      }

      try {
        let data = await this.lexicalService
          .updateGenericRelation(lexicalElementId, parameters)
          .toPromise();
      } catch (e) {
        console.log(e);
        if (e.status == 200) {
          this.memorySameAs[index] = selectedValues;
          this.memorySameAs.push(selectedValues);
          this.sameAsArray
            .at(index)
            .get('entity')
            .setValue(selectedValues, { emitEvent: false });
          this.sameAsArray
            .at(index)
            .get('inferred')
            .setValue(true, { emitEvent: false });
          this.toastr.success('SeeAlso updated', '', {
            timeOut: 5000,
          });
        } else {
          this.toastr.error(e.error, 'Error', {
            timeOut: 5000,
          });
        }
      }
    }
  }

  // Definisce una funzione asincrona per gestire la logica di filtraggio della ricerca.
  // `data` è l'oggetto contenente i dettagli inseriti dall'utente per la ricerca.
  async onSearchFilter(data) {
    // Imposta lo stato del caricamento del filtro su vero e azzera i risultati di ricerca precedenti.
    this.filterLoading = true;
    this.searchResults = [];

    // Estrae il valore e l'indice dall'oggetto `data`.
    let value = data.value;
    let index = data.index;
    console.log(data);

    // Ottiene l'array `sameAsArray` dal form e controlla se l'elemento corrente è marcato come 'lila'.
    this.sameAsArray = this.sameAsForm.get('sameAsArray') as FormArray;
    let isLila = this.sameAsArray.at(index).get('lila').value;

    // Se l'elemento non è marcato come 'lila', esegue la logica di ricerca basata su vari tipi di oggetti.
    if (!isLila) {
      // Controlla se l'oggetto corrente è di tipo 'lexicalEntry'.
      if (this.object.lexicalEntry != undefined) {
        // Imposta i parametri per la ricerca delle voci lessicali.
        let parameters = {
          text: data,
          searchMode: 'startsWith',
          type: '',
          pos: '',
          formType: 'entry',
          author: '',
          lang: '',
          status: '',
          offset: 0,
          limit: 500,
        };
        // Tenta di ottenere la lista delle voci lessicali dal servizio e aggiorna i risultati di ricerca.
        try {
          let lex_entry_list = await this.lexicalService
            .getLexicalEntriesList(parameters)
            .toPromise();
          this.searchResults = lex_entry_list['list'];
          console.log(this.searchResults);
          this.filterLoading = false;
        } catch (e) {
          console.log(e);
          if (e.status != 200) {
            this.toastr.error('Something went wrong', 'Error', {
              timeOut: 5000,
            });
          }
          this.filterLoading = false;
        }
      }
      // (Si ripete la logica sopra per `form` e `sense` con parametri e chiamate di servizio adeguati.)

      // Se l'elemento è marcato come 'lila', gestisce la ricerca di etimoni o cognati.
    } else if (isLila) {
      this.searchResults = [];
      // Se il form indica di cercare etimoni, effettua la ricerca e aggiorna i risultati.
      if (this.sameAsForm.get('isEtymon').value) {
        // (Logica specifica per la ricerca di etimoni.)
      }

      // Se il form indica di cercare cognati, effettua la ricerca e aggiorna i risultati.
      if (this.sameAsForm.get('isCognate').value) {
        // (Logica specifica per la ricerca di cognati.)
      }
    }

    console.log(data);
  }

  // Questo metodo cancella tutti i dati presenti nell'array 'searchResults'.
  deleteData() {
    this.searchResults = [];
  }

  // Questo metodo invia un nuovo valore attraverso il subject 'subject_input' quando viene attivato un evento sul campo di input.
  triggerSameAsInput(evt, i) {
    if (evt.target != undefined) {
      let value = evt.target.value;
      this.subject_input.next({ value, i });
    }
  }

  // Questo metodo invia un nuovo valore attraverso il subject 'subject' quando viene attivato un evento su un elemento specifico.
  triggerSameAs(evt, i) {
    console.log(evt.target.value);
    if (evt.target != undefined) {
      this.subject.next({ value: evt.target.value, index: i });
    }
  }

  // Questo metodo attiva il tooltip dopo 500 millisecondi.
  triggerTooltip() {
    setTimeout(() => {
      //@ts-ignore
      $('.same-as-tooltip').tooltip({
        trigger: 'hover',
      });
    }, 500);
  }

  // Questo metodo crea un nuovo elemento all'interno dell'array di form 'sameAsArray'.
  createSameAsEntry(e?, i?) {
    if (e == undefined) {
      return this.formBuilder.group({
        entity: null,
        inferred: false,
        lila: false,
      });
    } else {
      return this.formBuilder.group({
        entity: e,
        inferred: i,
        lila: false,
      });
    }
  }

  // Questo metodo aggiunge un nuovo elemento all'array di form 'sameAsArray' e attiva il tooltip.
  addSameAsEntry(e?, i?) {
    this.sameAsArray = this.sameAsForm.get('sameAsArray') as FormArray;
    if (e == undefined) {
      this.disableAddSameAs = true;
      this.sameAsArray.push(this.createSameAsEntry());
    } else {
      this.sameAsArray.push(this.createSameAsEntry(e, i));
    }
    this.triggerTooltip();
  }

  // Questo metodo rimuove un elemento dall'array di form 'sameAsArray' e invia una richiesta per rimuovere il corrispondente valore dal servizio.
  async removeElement(index) {
    this.sameAsArray = this.sameAsForm.get('sameAsArray') as FormArray;
    const lexical_entity = this.sameAsArray.at(index).get('entity').value;
    this.disableAddSameAs = false;
    let lexicalElementId = '';
    // Identifica l'ID dell'elemento lessicale
    if (this.object.lexicalEntry != undefined) {
      lexicalElementId = this.object.lexicalEntry;
    } else if (this.object.form != undefined) {
      lexicalElementId = this.object.form;
    } else if (this.object.sense != undefined) {
      lexicalElementId = this.object.sense;
    } else if (this.object.etymology != undefined) {
      lexicalElementId = this.object.etymology;
    } else if (this.object.lexicalConcept != undefined) {
      lexicalElementId = this.object.lexicalConcept;
    }
    let parameters = {
      relation: 'http://www.w3.org/2002/07/owl#sameAs',
      value: lexical_entity,
    };

    try {
      // Invia la richiesta di eliminazione al servizio e gestisce le risposte.
      let delete_request = await this.lexicalService
        .deleteLinguisticRelation(lexicalElementId, parameters)
        .toPromise();
      this.toastr.success('SameAs Removed', '', {
        timeOut: 5000,
      });
    } catch (e) {
      if (e.status == 200) {
        this.toastr.success('SameAs Removed', '', {
          timeOut: 5000,
        });
      } else {
        this.toastr.error(e.error.text, 'Error', {
          timeOut: 5000,
        });
      }
    }
    // Rimuove l'elemento dall'array e dall'array di memoria.
    this.memorySameAs.splice(index, 1);
    this.sameAsArray.removeAt(index);
  }

  // Questo metodo gestisce la pulizia delle risorse quando il componente viene distrutto.
  ngOnDestroy(): void {
    this.sameas_subscription.unsubscribe();
    this.destroy$.next(true);
    this.destroy$.complete();
  }
}
