/*
  © Copyright 2021-2022  Istituto di Linguistica Computazionale "A. Zampolli", Consiglio Nazionale delle Ricerche, Pisa, Italy.
 
This file is part of EpiLexo.

EpiLexo is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

EpiLexo is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with EpiLexo. If not, see <https://www.gnu.org/licenses/>.
*/

import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { LexicalEntriesService } from 'src/app/services/lexical-entries/lexical-entries.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-see-also',
  templateUrl: './see-also.component.html',
  styleUrls: ['./see-also.component.scss'],
})
export class SeeAlsoComponent implements OnInit, OnDestroy {
  @Input() seeAlsoData: any[] | any;

  private subject: Subject<any> = new Subject();
  private subject_input: Subject<any> = new Subject();

  subscription: Subscription;
  object: any;
  peopleLoading = false;

  destroy$: Subject<boolean> = new Subject();

  isSense;
  isForm;
  isLexEntry;
  isLexicalConcept;

  searchResults: [];
  memorySeeAlso = [];
  filterLoading = false;
  disableSeeAlso = false;

  seeAlsoForm = new FormGroup({
    seeAlsoArray: new FormArray([this.createSeeAlsoEntry()]),
  });

  seeAlsoArray: FormArray;

  search_filter_subscriber: Subscription;
  search_by_input_subscriber: Subscription;

  constructor(
    private formBuilder: FormBuilder,
    private lexicalService: LexicalEntriesService,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    // Inizializzazione del form per la gestione degli elementi "see also"
    this.seeAlsoForm = this.formBuilder.group({
      seeAlsoArray: this.formBuilder.array([]),
    });

    // Attivazione degli eventi di cambio
    this.onChanges();

    // Sottoscrizione all'observable per la ricerca filtrata
    this.search_filter_subscriber = this.subject
      .pipe(debounceTime(3000), takeUntil(this.destroy$))
      .subscribe((data) => {
        console.log(data);
        this.onSearchFilter(data);
      });

    // Sottoscrizione all'observable per la ricerca tramite input
    this.search_by_input_subscriber = this.subject_input
      .pipe(debounceTime(3000), takeUntil(this.destroy$))
      .subscribe((data) => {
        this.onChangeSeeAlsoByInput(data['value'], data['i']);
      });

    // Attivazione del tooltip dopo 500 millisecondi
    this.triggerTooltip();
  }

  // Funzione per attivare il tooltip
  triggerTooltip() {
    setTimeout(() => {
      //@ts-ignore
      $('.see-also-tooltip').tooltip({
        trigger: 'hover',
      });
    }, 500);
  }

  // Gestione degli eventi di cambio
  ngOnChanges(changes: SimpleChanges) {
    setTimeout(() => {
      if (changes.seeAlsoData.currentValue != null) {
        // Se è stato fornito un nuovo valore per "seeAlsoData"
        this.object = changes.seeAlsoData.currentValue;
        this.seeAlsoArray = this.seeAlsoForm.get('seeAlsoArray') as FormArray;
        this.seeAlsoArray.clear();
        this.memorySeeAlso = [];
        this.disableSeeAlso = false;

        this.object.array.forEach((element) => {
          if (element.label != '') {
            this.addSeeAlsoEntry(
              element.label,
              element.inferred,
              element.entity,
              element.linkType
            );
            this.memorySeeAlso.push(element.entity);
          } else {
            this.addSeeAlsoEntry(
              element.entity,
              element.inferred,
              element.entity,
              element.linkType
            );
            this.memorySeeAlso.push(element.entity);
          }
        });

        // Determinazione del tipo di elemento
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

  // Funzione asincrona per gestire il cambio di "see also" tramite input
  async onChangeSeeAlsoByInput(value, index) {
    if (value.trim() != '') {
      var selectedValues = value;
      var lexicalElementId = '';
      if (
        this.object.lexicalEntry != undefined &&
        this.object.form == undefined &&
        this.object.sense == undefined
      ) {
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
        this.memorySeeAlso[index] == '' ||
        this.memorySeeAlso[index] == undefined
      ) {
        // Se non c'è un valore precedente
        let parameters = {
          type: 'reference',
          relation: 'http://www.w3.org/2000/01/rdf-schema#seeAlso',
          value: selectedValues,
        };
        try {
          let data = await this.lexicalService
            .updateGenericRelation(lexicalElementId, parameters)
            .toPromise();
        } catch (e) {
          console.log(e);
          if (e.status == 200) {
            this.memorySeeAlso.push(selectedValues);
            this.toastr.success('SeeAlso updated', '', {
              timeOut: 5000,
            });
          } else {
            this.toastr.error(e.error, 'Error', {
              timeOut: 5000,
            });
          }
        }
      } else {
        // Se c'è un valore precedente
        let oldValue = this.memorySeeAlso[index];
        let parameters = {
          type: 'reference',
          relation: 'http://www.w3.org/2000/01/rdf-schema#seeAlso',
          value: selectedValues,
          currentValue: oldValue,
        };
        try {
          let data = await this.lexicalService
            .updateGenericRelation(lexicalElementId, parameters)
            .toPromise();
        } catch (e) {
          if (e.status == 200) {
            this.memorySeeAlso.push(selectedValues);
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
    this.disableSeeAlso = false;
  }

  async onChangeSeeAlso(seeAlso, index) {
    // Abilita la modifica di "SeeAlso"
    this.disableSeeAlso = false;

    // Verifica se sono stati selezionati degli elementi
    if (seeAlso.selectedItems.length != 0) {
      // Ottieni i valori selezionati
      var selectedValues = seeAlso.selectedItems[0].value.lexicalEntry;
      var lexicalElementId = '';

      // Ottieni l'ID dell'elemento lessicale corrente
      if (this.object.lexicalEntry != undefined) {
        lexicalElementId = this.object.lexicalEntry;
      } else if (this.object.form != undefined) {
        lexicalElementId = this.object.form;
      } else if (this.object.sense != undefined) {
        lexicalElementId = this.object.sense;
      } else if (this.object.etymology != undefined) {
        lexicalElementId = this.object.etymology;
      }

      // Se non esiste un valore precedentemente memorizzato per "SeeAlso"...
      if (this.memorySeeAlso[index] == undefined) {
        // Definisci i parametri per l'aggiornamento
        let parameters = {
          type: 'reference',
          relation: 'http://www.w3.org/2000/01/rdf-schema#seeAlso',
          value: selectedValues,
        };
        console.log(parameters);

        try {
          // Aggiorna la relazione generica nel servizio lessicale
          let data = await this.lexicalService
            .updateGenericRelation(lexicalElementId, parameters)
            .toPromise();
        } catch (e) {
          // Gestisci eventuali errori
          if (e.status == 200) {
            this.memorySeeAlso[index] = selectedValues;
            this.lexicalService.refreshLinkCounter('+1');
            this.toastr.success('SeeAlso aggiornato', '', {
              timeOut: 5000,
            });
          } else {
            this.toastr.error(e.error, 'Errore', {
              timeOut: 5000,
            });
          }
        }
      } else {
        // Se esiste un valore precedentemente memorizzato per "SeeAlso"...
        let oldValue = this.memorySeeAlso[index];
        let parameters = {
          type: 'reference',
          relation: 'http://www.w3.org/2000/01/rdf-schema#seeAlso',
          value: selectedValues,
          currentValue: oldValue,
        };
        console.log(parameters);
        try {
          // Aggiorna la relazione generica nel servizio lessicale
          let data = await this.lexicalService
            .updateGenericRelation(lexicalElementId, parameters)
            .toPromise();
        } catch (e) {
          // Gestisci eventuali errori
          if (e.status == 200) {
            this.memorySeeAlso[index] = selectedValues;
            this.lexicalService.refreshLinkCounter('+1');
            this.toastr.success('SeeAlso aggiornato', '', {
              timeOut: 5000,
            });
          } else {
            this.toastr.error(e.error, 'Errore', {
              timeOut: 5000,
            });
          }
        }
      }
    }
  }

  deleteData() {
    // Cancella i risultati della ricerca
    this.searchResults = [];
  }

  // Questa funzione gestisce il filtraggio delle ricerche in base ai dati forniti.

  onSearchFilter(data) {
    // Imposta il flag di caricamento del filtro su true.
    this.filterLoading = true;
    // Inizializza l'array dei risultati della ricerca.
    this.searchResults = [];
    // Stampa a console l'oggetto corrente.
    console.log(this.object);

    // Controlla se l'oggetto contiene un'entry lessicale ma non una forma o un significato.
    if (
      this.object.lexicalEntry != undefined &&
      this.object.form == undefined &&
      this.object.sense == undefined
    ) {
      // Imposta i parametri per la ricerca di voci lessicali.
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
      // Esegue la chiamata al servizio per ottenere l'elenco delle voci lessicali.
      this.lexicalService
        .getLexicalEntriesList(parameters)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            console.log(data);
            // Verifica se sono stati ottenuti dati validi.
            if (data) {
              let filter_lang = data.list;

              // Aggiunge un'etichetta che combina la label e la lingua per ciascun elemento dell'array.
              filter_lang.forEach((element) => {
                element['label_lang'] = element.label + '@' + element.language;
              });
              console.log(filter_lang);
              // Aggiorna i risultati della ricerca con l'elenco ottenuto.
              this.searchResults = data.list;
            }
          },
          (error) => {
            console.log(error);
          }
        );
    }
    // Controlla se l'oggetto contiene una forma.
    else if (this.object.form != undefined) {
      // Ottiene l'ID lessicale dalla forma.
      let lexId = this.object.parentInstanceName;
      // Imposta i parametri per la ricerca di forme.
      let parameters = {
        text: data,
        searchMode: 'startsWith',
        representationType: 'writtenRep',
        author: '',
        offset: 0,
        limit: 500,
      };
      // Esegue la chiamata al servizio per ottenere l'elenco delle forme.
      this.lexicalService
        .getFormList(parameters)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            console.log(data);
            // Verifica se sono stati ottenuti dati validi.
            if (data) {
              let filter_lang = data.list;

              // Aggiunge un'etichetta che combina la label e la lingua per ciascun elemento dell'array.
              filter_lang.forEach((element) => {
                element['label_lang'] = element.label + '@' + element.language;
              });
              console.log(filter_lang);
              // Aggiorna i risultati della ricerca con l'elenco ottenuto.
              this.searchResults = data.list;
            }
          },
          (error) => {
            console.log(error);
          }
        );
    }
    // Controlla se l'oggetto contiene un significato.
    else if (this.object.sense != undefined) {
      // Imposta i parametri per la ricerca di significati.
      let parameters = {
        text: data,
        searchMode: 'startsWith',
        type: '',
        field: 'definition',
        pos: '',
        formType: 'entry',
        author: '',
        lang: '',
        status: '',
        offset: 0,
        limit: 500,
      };
      // Esegue la chiamata al servizio per ottenere l'elenco dei significati.
      this.lexicalService
        .getLexicalSensesList(parameters)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            console.log(data);
            // Verifica se sono stati ottenuti dati validi.
            if (data) {
              let filter_lang = data.list;

              // Aggiunge un'etichetta che combina la label e la lingua per ciascun elemento dell'array.
              filter_lang.forEach((element) => {
                element['label_lang'] = element.label + '@' + element.language;
              });
              console.log(filter_lang);
              // Aggiorna i risultati della ricerca con l'elenco ottenuto.
              this.searchResults = data.list;
            }
          },
          (error) => {
            console.log(error);
          }
        );
    }
    // Controlla se l'oggetto contiene un'etimologia.
    else if (this.object.etymology != undefined) {
      // Imposta i parametri per la ricerca di voci lessicali con tipo "etymon".
      let parameters = {
        text: data,
        searchMode: 'startsWith',
        type: 'etymon',
        pos: '',
        formType: 'entry',
        author: '',
        lang: '',
        status: '',
        offset: 0,
        limit: 500,
      };
      // Esegue la chiamata al servizio per ottenere l'elenco delle voci lessicali.
      this.lexicalService
        .getLexicalEntriesList(parameters)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            console.log(data);
            // Verifica se sono stati ottenuti dati validi.
            if (data) {
              let filter_lang = data.list;

              // Aggiunge un'etichetta che combina la label e la lingua per ciascun elemento dell'array.
              filter_lang.forEach((element) => {
                element['label_lang'] = element.label + '@' + element.language;
              });
              console.log(filter_lang);
              // Aggiorna i risultati della ricerca con l'elenco ottenuto.
              this.searchResults = data.list;
            }
          },
          (error) => {
            console.log(error);
          }
        );
    }
    // Se l'oggetto non corrisponde a nessuno dei casi precedenti, imposta il flag di caricamento del filtro su false.
    else {
      this.filterLoading = false;
    }
    //console.log(data)
  }

  /**
   * Funzione chiamata quando viene rilevato un input nell'elemento che attiva la funzione 'SeeAlso'.
   * @param evt Evento dell'input.
   * @param i Indice associato all'input.
   */
  triggerSeeAlsoInput(evt, i) {
    // Controlla se il tasto premuto non è 'Control', 'Shift' o 'Alt'.
    if (evt.key != 'Control' && evt.key != 'Shift' && evt.key != 'Alt') {
      // Ottiene il valore dell'input.
      let value = evt.target.value;
      // Notifica il valore dell'input e l'indice ai sottoscrittori del soggetto 'subject_input'.
      this.subject_input.next({ value, i });
    }
  }

  /**
   * Funzione chiamata quando viene attivato l'evento 'SeeAlso'.
   * @param evt Evento di 'SeeAlso'.
   */
  triggerSeeAlso(evt) {
    // Controlla se l'elemento target non è undefined.
    if (evt.target != undefined) {
      // Notifica il valore dell'elemento target ai sottoscrittori del soggetto 'subject'.
      this.subject.next(evt.target.value);
    }
  }

  /**
   * Sottoscrive alla modifica dei valori del form 'seeAlsoForm' e applica una pausa di 200ms prima di propagare i cambiamenti.
   */
  onChanges(): void {
    this.seeAlsoForm.valueChanges
      .pipe(debounceTime(200), takeUntil(this.destroy$))
      .subscribe((searchParams) => {
        //console.log(searchParams)
      });
  }

  /**
   * Crea un nuovo oggetto FormGroup per un'entry di 'SeeAlso'.
   * @param e Entità dell'entry. Può essere null.
   * @param i Valore booleano che indica se l'entry è inferita o meno.
   * @param le Entità lessicale dell'entry. Può essere null.
   * @param lt Tipo di collegamento dell'entry. Per default è 'internal'.
   * @returns Un nuovo FormGroup per l'entry di 'SeeAlso'.
   */
  createSeeAlsoEntry(e?, i?, le?, lt?) {
    // Controlla se l'entità è undefined.
    if (e == undefined) {
      // Restituisce un nuovo FormGroup con i valori di default.
      return this.formBuilder.group({
        entity: null,
        inferred: false,
        lexical_entity: null,
        link_type: 'internal',
      });
    } else {
      // Restituisce un nuovo FormGroup con i valori passati come argomento.
      return this.formBuilder.group({
        entity: e,
        inferred: i,
        lexical_entity: le,
        link_type: lt,
      });
    }
  }

  /**
   * Aggiunge una voce di "Vedi anche" al formulario.
   * @param e Opzionale. Entità lessicale.
   * @param i Opzionale. Identificatore.
   * @param le Opzionale. Entità lessicale.
   * @param lt Opzionale. Tipo lessicale.
   */
  addSeeAlsoEntry(e?, i?, le?, lt?) {
    // Ottiene l'array di voci "Vedi anche" dal formulario
    this.seeAlsoArray = this.seeAlsoForm.get('seeAlsoArray') as FormArray;

    // Controlla se l'entità è definita
    if (e == undefined) {
      // Disabilita "Vedi anche"
      this.disableSeeAlso = true;
      // Aggiunge una nuova voce "Vedi anche" al formulario
      this.seeAlsoArray.push(this.createSeeAlsoEntry());
    } else {
      // Aggiunge una nuova voce "Vedi anche" al formulario con i parametri forniti
      this.seeAlsoArray.push(this.createSeeAlsoEntry(e, i, le, lt));
    }

    // Attiva il tooltip
    this.triggerTooltip();
  }

  /**
   * Rimuove un elemento dalla lista "Vedi anche".
   * @param index Indice dell'elemento da rimuovere.
   */
  async removeElement(index) {
    // Ottiene l'array di voci "Vedi anche" dal formulario
    this.seeAlsoArray = this.seeAlsoForm.get('seeAlsoArray') as FormArray;

    // Ottiene l'entità lessicale dall'indice specificato
    let lexical_entity = this.seeAlsoArray
      .at(index)
      .get('lexical_entity').value;

    // Se l'entità lessicale è vuota o nulla, utilizza l'entità generale
    if (lexical_entity == '' || lexical_entity == null) {
      lexical_entity = this.seeAlsoArray.at(index).get('entity').value;
    }

    // Verifica il tipo di oggetto
    if (this.object.lexicalEntry != undefined) {
      // Se l'oggetto è un'entry lessicale
      let lexId = this.object.lexicalEntry;

      // Parametri per la rimozione della relazione lessicale
      let parameters = {
        relation: 'http://www.w3.org/2000/01/rdf-schema#seeAlso',
        value: lexical_entity,
      };

      try {
        // Rimuove la relazione lessicale
        let delete_see_also = await this.lexicalService
          .deleteLinguisticRelation(lexId, parameters)
          .toPromise();

        // Aggiorna la carta core
        this.lexicalService.updateCoreCard(this.object);
        // Mostra un messaggio di successo
        this.toastr.success('Vedi anche eliminato', '', {
          timeOut: 5000,
        });
        // Aggiorna il contatore dei collegamenti
        this.lexicalService.refreshLinkCounter('-1');
      } catch (e) {
        // Se si verifica un errore, mostra un messaggio di errore
        if (e.status == 200) {
          this.toastr.success('Vedi anche eliminato', '', {
            timeOut: 5000,
          });
        } else {
          this.toastr.error(e.error, 'Errore', {
            timeOut: 5000,
          });
        }
        // Aggiorna il contatore dei collegamenti
        this.lexicalService.refreshLinkCounter('-1');
      }
    } else if (this.object.form != undefined) {
      // Se l'oggetto è una forma
      // Codice omesso per brevità...
    } else if (this.object.sense != undefined) {
      // Se l'oggetto è un senso
      // Codice omesso per brevità...
    } else if (this.object.etymology != undefined) {
      // Se l'oggetto è un'etimologia
      // Codice omesso per brevità...
    } else if (this.object.lexicalConcept != undefined) {
      // Se l'oggetto è un concetto lessicale
      // Codice omesso per brevità...
    }
    // Riattiva "Vedi anche"
    this.disableSeeAlso = false;
    // Rimuove l'elemento dall'array di memoria
    this.memorySeeAlso.splice(index, 1);
    // Rimuove l'elemento dall'array "Vedi anche"
    this.seeAlsoArray.removeAt(index);
  }

  /**
   * Effettua le pulizie necessarie quando il componente viene distrutto.
   */
  ngOnDestroy(): void {
    // Annulla la sottoscrizione ai filtri di ricerca
    this.search_filter_subscriber.unsubscribe();
    this.search_by_input_subscriber.unsubscribe();

    // Completa e distrugge il soggetto
    this.destroy$.next(true);
    this.destroy$.complete();
  }
}
