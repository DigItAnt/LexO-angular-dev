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
import { debounceTime, pairwise, startWith, takeUntil } from 'rxjs/operators';
import { ConceptService } from 'src/app/services/concept/concept.service';
import { ToastrService } from 'ngx-toastr';
import { NgSelectComponent } from '@ng-select/ng-select';
@Component({
  selector: 'app-lexical-concept-form',
  templateUrl: './lexical-concept-form.component.html',
  styleUrls: ['./lexical-concept-form.component.scss'],
})
export class LexicalConceptFormComponent implements OnInit, OnDestroy {
  switchInput = false;
  subscription: Subscription;
  object: any;
  peopleLoading = false;
  counter = 0;
  componentRef: any;

  @Input() lexicalConceptData: any;

  lexicalConceptForm = new FormGroup({
    defaultLabel: new FormControl(''),
    definition: new FormControl(''),
    isEvokedBy: new FormArray([this.createIsEvokedBy()]),
    lexicalizedSenses: new FormArray([this.createLexicalizedSense()]),
  });

  isEvokedByArray: FormArray;
  lexicalizedSensesArray: FormArray;
  /* scheme: FormArray;
  conceptReference: FormArray; */

  destroy$: Subject<boolean> = new Subject();
  disableAddIsEvokedBy: boolean = false;
  disableAddLexicalizedSense: boolean = false;
  memoryIsEvokedBy = [];
  memoryLexicalizedSenses = [];
  evokedBySubject: Subject<any> = new Subject();
  lexicalizedSenseSubject: Subject<any> = new Subject();

  searchResults: any[] = [];
  searchResultsSenses: any[] = [];

  constructor(
    private lexicalService: LexicalEntriesService,
    private formBuilder: FormBuilder,
    private conceptService: ConceptService,
    private toastr: ToastrService
  ) {}

  // Inizializzazione del componente Angular
  ngOnInit() {
    // Creazione del FormGroup per il form di inserimento dei concetti lessicali
    this.lexicalConceptForm = this.formBuilder.group({
      defaultLabel: null, // Etichetta predefinita del concetto
      definition: null, // Definizione del concetto
      isEvokedBy: this.formBuilder.array([]), // Array di entità che evocano il concetto
      lexicalizedSenses: this.formBuilder.array([]), // Array di sensi lessicalizzati del concetto
    });

    // Inizializzazione degli eventi e dei tooltip
    this.onChanges();
    this.triggerTooltip();

    // Sottoscrizione agli eventi di ricerca per entità che evocano il concetto e sensi lessicalizzati
    this.evokedBySubject
      .pipe(debounceTime(3000), takeUntil(this.destroy$))
      .subscribe((data) => {
        this.onSearchFilter(data);
      });

    this.lexicalizedSenseSubject
      .pipe(debounceTime(3000), takeUntil(this.destroy$))
      .subscribe((data) => {
        this.onSearchFilterLexicalizedSense(data);
      });
  }

  // Gestione dei cambiamenti nei dati di input
  ngOnChanges(changes: SimpleChanges) {
    setTimeout(() => {
      // Se i dati del concetto lessicale cambiano, reimposta il form
      if (this.object != changes.lexicalConceptData.currentValue) {
        this.isEvokedByArray = this.lexicalConceptForm.get(
          'isEvokedBy'
        ) as FormArray;
        this.isEvokedByArray.clear();

        this.lexicalizedSensesArray = this.lexicalConceptForm.get(
          'lexicalizedSenses'
        ) as FormArray;
        this.lexicalizedSensesArray.clear();

        this.lexicalConceptForm.reset();

        this.disableAddIsEvokedBy = false;
        this.disableAddLexicalizedSense = false;
        this.memoryIsEvokedBy = [];
        this.memoryLexicalizedSenses = [];
      }

      this.object = changes.lexicalConceptData.currentValue;

      // Popola il form con i dati del concetto lessicale
      if (this.object != null) {
        this.lexicalConceptForm
          .get('defaultLabel')
          .setValue(this.object.defaultLabel, { emitEvent: false });
        this.lexicalConceptForm
          .get('definition')
          .setValue(this.object.definition, { emitEvent: false });

        const conceptId = this.object.lexicalConcept;

        // Ottieni le entità che evocano il concetto e aggiungile al form
        this.lexicalService
          .getLexEntryLinguisticRelation(conceptId, 'isEvokedBy')
          .pipe(takeUntil(this.destroy$))
          .subscribe(
            (data) => {
              console.log(data);
              for (var i = 0; i < data.length; i++) {
                let entity = data[i]['entity'];
                let type = data[i]['linkType'];
                let label = data[i]['label'];
                let inferred = data[i]['inferred'];
                this.addIsEvokedBy(entity, type, inferred, label);
                this.memoryIsEvokedBy.push(data[i]);
              }
            },
            (error) => {
              console.log(error);
            }
          );

        // Ottieni i sensi lessicalizzati del concetto e aggiungili al form
        this.lexicalService
          .getLexEntryLinguisticRelation(conceptId, 'lexicalizedSense')
          .pipe(takeUntil(this.destroy$))
          .subscribe(
            (data) => {
              console.log(data);
              for (var i = 0; i < data.length; i++) {
                let entity = data[i]['entity'];
                let type = data[i]['linkType'];
                let label = data[i]['label'];
                let inferred = data[i]['inferred'];

                this.lexicalService
                  .getSenseData(entity, 'core')
                  .pipe(takeUntil(this.destroy$))
                  .subscribe(
                    (res) => {
                      console.log(res);
                      let lexicalEntryLabel = res.lexicalEntryLabel;
                      this.addLexicalizedSense(
                        entity,
                        type,
                        inferred,
                        label,
                        lexicalEntryLabel
                      );
                      this.memoryLexicalizedSenses.push(data[i]);
                    },
                    (error) => {
                      console.log(error);
                    }
                  );
              }
            },
            (error) => {
              console.log(error);
            }
          );
      }
      // Aggiorna i tooltip dopo un breve ritardo
      this.triggerTooltip();
    }, 10);
  }

  // Attiva i tooltip
  triggerTooltip() {
    setTimeout(() => {
      //@ts-ignore
      $('.vartrans-tooltip').tooltip({
        trigger: 'hover',
      });
    }, 500);
  }

  /**
   * Gestisce i cambiamenti nei valori del form per l'etichetta predefinita e la definizione.
   * Quando viene modificata l'etichetta predefinita, aggiorna l'etichetta predefinita del concetto e notifica l'utente del successo o del fallimento dell'operazione.
   * Quando viene modificata la definizione, aggiorna la definizione del concetto e notifica l'utente del successo o del fallimento dell'operazione.
   */
  onChanges(): void {
    this.lexicalConceptForm
      .get('defaultLabel')
      .valueChanges.pipe(
        debounceTime(3000),
        startWith(this.lexicalConceptForm.get('defaultLabel').value),
        pairwise(),
        takeUntil(this.destroy$)
      )
      .subscribe(([prev, next]: [any, any]) => {
        if (next != null) {
          let parameters = {
            relation: 'http://www.w3.org/2004/02/skos/core#prefLabel',
            source: this.object.lexicalConcept,
            target: next,
            oldTarget: this.object.defaultLabel,
            targetLanguage: this.object.language,
            oldTargetLanguage: this.object.language,
          };

          this.conceptService
            .updateSkosLabel(parameters)
            .pipe(takeUntil(this.destroy$))
            .subscribe(
              (data) => {
                console.log(data);
              },
              (error) => {
                console.log(error);

                if (error.status != 200) {
                  this.toastr.error(error.error, 'Error', {
                    timeOut: 5000,
                  });
                } else {
                  const data = this.object;
                  data['request'] = 0;
                  data['new_label'] = next;
                  this.object.defaultLabel = next;
                  this.lexicalService.refreshAfterEdit(data);
                  this.lexicalService.spinnerAction('off');
                  this.lexicalService.updateCoreCard({
                    lastUpdate: error.error.text,
                  });
                  this.toastr.success(
                    'Label changed correctly for ' + this.object.lexicalConcept,
                    '',
                    {
                      timeOut: 5000,
                    }
                  );
                }
              }
            );
        }
      });

    this.lexicalConceptForm
      .get('definition')
      .valueChanges.pipe(
        debounceTime(3000),
        startWith(this.lexicalConceptForm.get('definition').value),
        pairwise(),
        takeUntil(this.destroy$)
      )
      .subscribe(([prev, next]: [any, any]) => {
        if (next != null) {
          let parameters;

          if (next == '') {
            let valueToDelete = '';
            if (prev == null) {
              valueToDelete = this.object.definition;
            } else {
              valueToDelete = prev;
            }
            parameters = {
              relation: 'http://www.w3.org/2004/02/skos/core#definition',
              value: valueToDelete,
            };

            this.conceptService
              .deleteRelation(this.object.lexicalConcept, parameters)
              .pipe(takeUntil(this.destroy$))
              .subscribe(
                (data) => {
                  console.log(data);
                },
                (error) => {
                  if (error.status != 200) {
                    this.toastr.error(error.error, 'Error', {
                      timeOut: 5000,
                    });
                  } else {
                    this.object.definition = next;
                    this.lexicalService.spinnerAction('off');
                    this.lexicalService.updateCoreCard({
                      lastUpdate: error.error.text,
                    });
                    this.toastr.success(
                      'Definition changed correctly for ' +
                        this.object.lexicalConcept,
                      '',
                      {
                        timeOut: 5000,
                      }
                    );
                    this.lexicalConceptForm
                      .get('definition')
                      .setValue(next, { emitEvent: false });
                  }
                }
              );
          } else {
            parameters = {
              relation: 'http://www.w3.org/2004/02/skos/core#definition',
              source: this.object.lexicalConcept,
              target: next,
              oldTarget: this.object.definition,
              targetLanguage: this.object.language,
              oldTargetLanguage: this.object.language,
            };

            this.conceptService
              .updateNoteProperty(parameters)
              .pipe(takeUntil(this.destroy$))
              .subscribe(
                (data) => {
                  console.log(data);
                },
                (error) => {
                  console.log(error);

                  if (error.status != 200) {
                    this.toastr.error(error.error, 'Error', {
                      timeOut: 5000,
                    });
                  } else {
                    this.object.definition = next;
                    this.lexicalService.spinnerAction('off');
                    this.lexicalService.updateCoreCard({
                      lastUpdate: error.error.text,
                    });
                    this.toastr.success(
                      'Definition changed correctly for ' +
                        this.object.lexicalConcept,
                      '',
                      {
                        timeOut: 5000,
                      }
                    );
                    this.lexicalConceptForm
                      .get('definition')
                      .setValue(next, { emitEvent: false });
                  }
                }
              );
          }
        }
      });
  }

  /**
   * Effettua una ricerca filtrata per i dati specificati e aggiorna i risultati di ricerca.
   * @param data Oggetto contenente i dati di ricerca (valore da cercare, indice della ricerca).
   */
  onSearchFilter(data) {
    this.searchResults = [];

    let value = data.value;
    let index = data.index;

    this.isEvokedByArray = this.lexicalConceptForm.get(
      'isEvokedBy'
    ) as FormArray;

    let parameters = {
      text: value,
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

    this.lexicalService
      .getLexicalEntriesList(parameters)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (data) => {
          console.log(data);

          if (data.list.length > 0) {
            let filter_lang = data.list.filter(
              (element) => element.language != 'null'
            );

            console.log(filter_lang);
            this.searchResults = filter_lang;
          } else {
            let filter_lang = [];
            this.searchResults = filter_lang;
          }
        },
        (error) => {
          //console.log(error)
        }
      );
  }

  // Funzione per filtrare e cercare i sensi lessicalizzati.
  // Riceve un oggetto 'data' contenente il valore da cercare e l'indice associato.
  onSearchFilterLexicalizedSense(data) {
    // Inizializza l'array dei risultati della ricerca dei sensi.
    this.searchResultsSenses = [];

    // Estrae il valore e l'indice dall'oggetto 'data'.
    let value = data.value;
    let index = data.index;

    // Ottiene l'array 'isEvokedBy' dal modulo 'lexicalConceptForm'.
    this.isEvokedByArray = this.lexicalConceptForm.get(
      'isEvokedBy'
    ) as FormArray;

    // Definisce i parametri per la ricerca.
    let parameters = {
      text: value,
      searchMode: 'startsWith',
      type: '',
      field: '',
      pos: '',
      formType: 'entry',
      author: '',
      lang: '',
      status: '',
      offset: 0,
      limit: 500,
    };

    // Effettua una chiamata al servizio per ottenere l'elenco dei sensi lessicalizzati.
    this.lexicalService
      .getLexicalSensesList(parameters)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (data) => {
          console.log(data);

          if (data.list.length > 0) {
            // Filtra i risultati per la lingua non nulla.
            let filter_lang = data.list.filter(
              (element) => element.language != 'null'
            );

            console.log(filter_lang);
            // Assegna i risultati filtrati agli elementi di ricerca.
            this.searchResultsSenses = filter_lang;
          } else {
            // Nessuna azione se non ci sono risultati.
          }
        },
        (error) => {
          // Gestione degli errori in caso di fallimento della chiamata.
          //console.log(error)
        }
      );
  }

  // Funzione per gestire il trigger 'isEvokedBy'.
  // Riceve l'evento 'evt' e l'indice 'i'.
  triggerIsEvokedBy(evt, i) {
    console.log(evt);
    if (evt.target != undefined) {
      // Emette il valore e l'indice tramite il subject 'evokedBySubject'.
      this.evokedBySubject.next({ value: evt.target.value, index: i });
    }
  }

  // Funzione per gestire il trigger 'lexicalizedSense'.
  // Riceve l'evento 'evt' e l'indice 'i'.
  triggerLexicalizedSense(evt, i) {
    console.log(evt);
    if (evt.target != undefined) {
      // Emette il valore e l'indice tramite il subject 'lexicalizedSenseSubject'.
      this.lexicalizedSenseSubject.next({ value: evt.target.value, index: i });
    }
  }

  // Funzione per gestire l'evento di cambiamento di 'isEvokedBy'.
  // Riceve l'evento 'evt' e l'indice 'i'.
  handleIsEvokedBy(evt, i) {
    if (evt instanceof NgSelectComponent) {
      if (evt.selectedItems.length > 0) {
        console.log(evt.selectedItems[0]);

        // Ottiene l'entità e l'etichetta selezionate.
        let entity = evt.selectedItems[0].value['lexicalEntry'];
        let label = evt.selectedItems[0].value['label'];

        // Chiama la funzione per il cambiamento di 'isEvokedBy'.
        this.onChangeIsEvokedBy({ name: entity, i: i, label: label });
      }
    }
  }

  // Funzione per gestire l'evento di cambiamento di 'lexicalizedSense'.
  // Riceve l'evento 'evt' e l'indice 'i'.
  handleLexicalizedSense(evt, i) {
    if (evt instanceof NgSelectComponent) {
      if (evt.selectedItems.length > 0) {
        console.log(evt.selectedItems[0]);

        // Ottiene l'entità e l'etichetta selezionate.
        let entity = evt.selectedItems[0].value['sense'];
        let label = evt.selectedItems[0].value['lemma'];

        // Chiama la funzione per il cambiamento di 'lexicalizedSense'.
        this.onChangeLexicalizedSense({ name: entity, i: i, label: label });
      }
    }
  }

  // Funzione chiamata quando avviene un cambiamento in 'isEvokedBy'.
  // Riceve l'oggetto 'data' con i dettagli del cambiamento.
  onChangeIsEvokedBy(data) {
    var index = data['i'];
    this.isEvokedByArray = this.lexicalConceptForm.get(
      'isEvokedBy'
    ) as FormArray;

    // Verifica se l'entità esiste già nella memoria.
    let existOrNot = this.memoryIsEvokedBy.some(
      (element) => element?.entity == data.name || element?.name == data.name
    );

    if (this.memoryIsEvokedBy[index] == undefined && !existOrNot) {
      let newValue = data.name;

      // Definisce i parametri per l'aggiornamento della relazione linguistica.
      const parameters = {
        type: 'conceptRel',
        relation: 'http://www.w3.org/ns/lemon/ontolex#isEvokedBy',
        value: newValue,
      };
      console.log(parameters);
      let conceptId = this.object.lexicalConcept;

      // Effettua l'aggiornamento della relazione linguistica tramite il servizio.
      this.lexicalService
        .updateLinguisticRelation(conceptId, parameters)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            console.log(data);
            this.lexicalService.spinnerAction('off');
            data['request'] = 0;
            this.lexicalService.refreshAfterEdit(data);
            this.lexicalService.updateCoreCard(data);
            this.disableAddIsEvokedBy = false;
          },
          (error) => {
            console.log(error);

            /* this.toastr.error(error.error, 'Error', {
              timeOut: 5000,
          }); */
            this.lexicalService.updateCoreCard({
              lastUpdate: error.error.text,
            });
            this.lexicalService.spinnerAction('off');
            if (error.status == 200) {
              this.disableAddIsEvokedBy = false;
              this.toastr.success(
                'Lexical concept added correctly for ' + conceptId,
                '',
                {
                  timeOut: 5000,
                }
              );
            } else {
              this.toastr.error(error.error, 'Error', {
                timeOut: 5000,
              });
            }

            // Aggiorna i valori del form in caso di errore.
            this.isEvokedByArray
              .at(index)
              .get('label')
              .setValue(data.label, { emitEvent: false });
            this.isEvokedByArray
              .at(index)
              .get('entity')
              .setValue(data.name, { emitEvent: false });
            this.isEvokedByArray
              .at(index)
              .get('type')
              .setValue('internal', { emitEvent: false });
            this.isEvokedByArray
              .at(index)
              .get('inferred')
              .setValue(false, { emitEvent: false });
          }
        );
      this.memoryIsEvokedBy[index] = data;
    } else if (this.memoryIsEvokedBy[index] != undefined) {
      const oldValue =
        this.memoryIsEvokedBy[index]['entity'] == undefined
          ? this.memoryIsEvokedBy[index]['instance_name']
          : this.memoryIsEvokedBy[index]['entity'];
      const newValue = data['name'];
      const parameters = {
        type: 'conceptRel',
        relation: 'http://www.w3.org/ns/lemon/ontolex#isEvokedBy',
        value: newValue,
        currentValue: oldValue,
      };

      let conceptId = this.object.lexicalConcept;
      console.log(parameters);
      // Effettua l'aggiornamento della relazione linguistica tramite il servizio.
      this.lexicalService
        .updateLinguisticRelation(conceptId, parameters)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            console.log(data);
            this.lexicalService.spinnerAction('off');
            this.lexicalService.updateCoreCard(data);
            data['request'] = 0;
            this.lexicalService.refreshAfterEdit(data);
          },
          (error) => {
            console.log(error);
            const data = this.object;
            data['request'] = 0;

            //this.lexicalService.refreshAfterEdit(data);
            this.lexicalService.updateCoreCard({
              lastUpdate: error.error.text,
            });
            this.lexicalService.spinnerAction('off');
            if (error.status == 200) {
              this.toastr.success(
                'Lexical Concept changed correctly for ' + conceptId,
                '',
                {
                  timeOut: 5000,
                }
              );
            } else {
              this.toastr.error(error.error, 'Error', {
                timeOut: 5000,
              });
            }
          }
        );
      this.memoryIsEvokedBy[index] = data;
    } else if (existOrNot) {
      // Segnala se il concetto lessicale esiste già nella voce lessicale.
      this.toastr.error(
        'This lexical concept already exist in this lexical entry',
        'Error',
        {
          timeOut: 5000,
        }
      );
    }
  }

  /**
   * Funzione per gestire il cambiamento di un senso lessicale.
   * @param data I dati relativi al cambiamento del senso lessicale.
   */
  onChangeLexicalizedSense(data) {
    var index = data['i'];
    this.lexicalizedSensesArray = this.lexicalConceptForm.get(
      'lexicalizedSenses'
    ) as FormArray;

    // Verifica se il senso lessicale esiste già nella memoria o nell'array di senso lessicale.
    let existOrNot = this.memoryLexicalizedSenses.some(
      (element) => element?.entity == data.name || element?.name == data.name
    );

    if (this.memoryLexicalizedSenses[index] == undefined && !existOrNot) {
      let newValue = data.name;

      // Costruzione dei parametri per l'aggiornamento della relazione linguistica.
      const parameters = {
        type: 'conceptRel',
        relation: 'http://www.w3.org/ns/lemon/ontolex#lexicalizedSense',
        value: newValue,
      };
      console.log(parameters);
      let conceptId = this.object.lexicalConcept;

      // Chiamata al servizio per l'aggiornamento della relazione linguistica.
      this.lexicalService
        .updateLinguisticRelation(conceptId, parameters)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            console.log(data);
            this.lexicalService.spinnerAction('off');
            data['request'] = 0;
            this.lexicalService.refreshAfterEdit(data);
            this.lexicalService.updateCoreCard(data);
            this.disableAddLexicalizedSense = false;
          },
          (error) => {
            console.log(error);

            /* this.toastr.error(error.error, 'Error', {
            timeOut: 5000,
        }); */
            this.lexicalService.updateCoreCard({
              lastUpdate: error.error.text,
            });
            this.lexicalService.spinnerAction('off');
            if (error.status == 200) {
              this.disableAddLexicalizedSense = false;
              this.toastr.success(
                'Lexicalized sense added correctly for ' + conceptId,
                '',
                {
                  timeOut: 5000,
                }
              );
              this.lexicalizedSensesArray
                .at(index)
                .get('label')
                .setValue(data.label, { emitEvent: false });
              this.lexicalizedSensesArray
                .at(index)
                .get('entity')
                .setValue(data.name, { emitEvent: false });
              this.lexicalizedSensesArray
                .at(index)
                .get('type')
                .setValue('internal', { emitEvent: false });
              this.lexicalizedSensesArray
                .at(index)
                .get('inferred')
                .setValue(false, { emitEvent: false });
            } else {
              this.toastr.error(error.error, 'Error', {
                timeOut: 5000,
              });
            }
          }
        );
      this.memoryLexicalizedSenses[index] = data;
    } else if (this.memoryLexicalizedSenses[index] != undefined) {
      const oldValue =
        this.memoryLexicalizedSenses[index]['entity'] == undefined
          ? this.memoryLexicalizedSenses[index]['name']
          : this.memoryLexicalizedSenses[index]['entity'];
      const newValue = data['name'];
      const parameters = {
        type: 'conceptRel',
        relation: 'http://www.w3.org/ns/lemon/ontolex#lexicalizedSense',
        value: newValue,
        currentValue: oldValue,
      };
      let raw_data = data;
      let conceptId = this.object.lexicalConcept;
      console.log(parameters);
      this.lexicalService
        .updateLinguisticRelation(conceptId, parameters)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            console.log(data);
            this.lexicalService.spinnerAction('off');
            this.lexicalService.updateCoreCard(data);
            data['request'] = 0;
            this.lexicalService.refreshAfterEdit(data);
          },
          (error) => {
            console.log(error);
            const data = raw_data;
            data['request'] = 0;

            //this.lexicalService.refreshAfterEdit(data);
            this.lexicalService.updateCoreCard({
              lastUpdate: error.error.text,
            });
            this.lexicalService.spinnerAction('off');
            if (error.status == 200) {
              this.toastr.success(
                'Lexicalized sense changed correctly for ' + conceptId,
                '',
                {
                  timeOut: 5000,
                }
              );
              this.lexicalizedSensesArray
                .at(index)
                .get('label')
                .setValue(data.label, { emitEvent: false });
              this.lexicalizedSensesArray
                .at(index)
                .get('entity')
                .setValue(data.name, { emitEvent: false });
              this.lexicalizedSensesArray
                .at(index)
                .get('type')
                .setValue('internal', { emitEvent: false });
              this.lexicalizedSensesArray
                .at(index)
                .get('inferred')
                .setValue(false, { emitEvent: false });
            } else {
              this.toastr.error(error.error, 'Error', {
                timeOut: 5000,
              });
            }
          }
        );
      this.memoryLexicalizedSenses[index] = data;
    } else if (existOrNot) {
      this.toastr.error(
        'This lexicalized sense already exist in this lexical entry',
        'Error',
        {
          timeOut: 5000,
        }
      );
    }
  }

  /**
   * Aggiunge un'entità che è evocata da questo concetto lessicale.
   * @param entity L'entità da aggiungere.
   * @param type Il tipo dell'entità.
   * @param inferred Indica se l'entità è inferita.
   * @param label L'etichetta dell'entità.
   */
  addIsEvokedBy(entity?, type?, inferred?, label?) {
    this.isEvokedByArray = this.lexicalConceptForm.get(
      'isEvokedBy'
    ) as FormArray;
    if (entity != undefined) {
      this.isEvokedByArray.push(
        this.createIsEvokedBy(entity, type, inferred, label)
      );
    } else {
      this.disableAddIsEvokedBy = true;
      this.isEvokedByArray.push(this.createIsEvokedBy());
    }
  }

  /**
   * Aggiunge un senso lessicale al concetto lessicale.
   * @param entity L'entità del senso lessicale.
   * @param type Il tipo del senso lessicale.
   * @param inferred Indica se il senso lessicale è inferito.
   * @param label L'etichetta del senso lessicale.
   * @param lexicalEntryLabel L'etichetta dell'entrata lessicale.
   */
  addLexicalizedSense(entity?, type?, inferred?, label?, lexicalEntryLabel?) {
    this.lexicalizedSensesArray = this.lexicalConceptForm.get(
      'lexicalizedSenses'
    ) as FormArray;
    if (entity != undefined) {
      this.lexicalizedSensesArray.push(
        this.createLexicalizedSense(
          entity,
          type,
          inferred,
          label,
          lexicalEntryLabel
        )
      );
    } else {
      this.disableAddIsEvokedBy = true;
      this.lexicalizedSensesArray.push(this.createLexicalizedSense());
    }
  }

  /**
   * Crea un FormGroup per rappresentare un'entità evocata da questo concetto lessicale.
   * @param e L'entità.
   * @param t Il tipo.
   * @param i Indica se l'entità è inferita.
   * @param l L'etichetta.
   * @returns Il FormGroup creato.
   */
  createIsEvokedBy(e?, t?, i?, l?): FormGroup {
    if (e != undefined) {
      return this.formBuilder.group({
        entity: e,
        inferred: i,
        label: l,
        type: t,
      });
    } else {
      return this.formBuilder.group({
        entity: new FormControl(''),
        inferred: new FormControl(false),
        label: new FormControl(''),
        type: new FormControl(''),
      });
    }
  }

  /**
   * Crea un FormGroup per rappresentare un senso lessicale.
   * @param e L'entità del senso lessicale.
   * @param t Il tipo del senso lessicale.
   * @param i Indica se il senso lessicale è inferito.
   * @param l L'etichetta del senso lessicale.
   * @param lElabel L'etichetta dell'entrata lessicale.
   * @returns Il FormGroup creato.
   */
  createLexicalizedSense(e?, t?, i?, l?, lElabel?): FormGroup {
    if (e != undefined) {
      return this.formBuilder.group({
        entity: e,
        inferred: i,
        label: l,
        type: t,
        lemma: lElabel + ' - ' + l,
      });
    } else {
      return this.formBuilder.group({
        entity: new FormControl(''),
        inferred: new FormControl(false),
        label: new FormControl(''),
        type: new FormControl(''),
        lemma: new FormControl(''),
      });
    }
  }

  /**
   * Rimuove un senso lessicale dall'array dei sensi lessicali e dal servizio, se presente.
   * @param index Indice del senso lessicale da rimuovere.
   */
  removeLexicalizedSense(index) {
    // Ottiene l'array dei sensi lessicali dal modulo di formazione dei concetti lessicali.
    this.lexicalizedSensesArray = this.lexicalConceptForm.get(
      'lexicalizedSenses'
    ) as FormArray;

    // Abilita nuovamente l'opzione per aggiungere un senso lessicale.
    this.disableAddLexicalizedSense = false;

    // Ottiene l'entità del senso lessicale da rimuovere.
    const entity = this.lexicalizedSensesArray.at(index).get('entity').value;

    // Ottiene l'ID del concetto lessicale.
    let conceptId = this.object.lexicalConcept;

    // Parametri per la richiesta di eliminazione del rapporto linguistico.
    let parameters = {
      relation: 'http://www.w3.org/ns/lemon/ontolex#lexicalizedSense',
      value: entity,
    };

    // Effettua la richiesta di eliminazione del rapporto linguistico solo se l'entità non è vuota.
    if (entity != '') {
      this.lexicalService
        .deleteLinguisticRelation(conceptId, parameters)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            console.log(data);
            // Aggiorna la carta principale.
            this.lexicalService.updateCoreCard(this.object);
            // Visualizza un messaggio di successo.
            this.toastr.success('Relazione rimossa', '', {
              timeOut: 5000,
            });
          },
          (error) => {
            console.log(error);
            // Visualizza un messaggio di errore e aggiorna la carta principale se lo status è 200.
            if (error.status == 200) {
              this.toastr.success('Relazione rimossa', '', {
                timeOut: 5000,
              });
            } else {
              this.toastr.error(error.error, 'Errore', {
                timeOut: 5000,
              });
            }
          }
        );
    }

    // Rimuove il senso lessicale dall'array.
    this.lexicalizedSensesArray.removeAt(index);

    // Rimuove il senso lessicale dalla memoria.
    this.memoryLexicalizedSenses.splice(index, 1);
  }

  /**
   * Rimuove un'entità che evoca il concetto lessicale dall'array e dal servizio, se presente.
   * @param index Indice dell'entità da rimuovere.
   */
  removeIsEvokedBy(index) {
    // Ottiene l'array delle entità che evocano il concetto lessicale dal modulo di formazione dei concetti lessicali.
    this.isEvokedByArray = this.lexicalConceptForm.get(
      'isEvokedBy'
    ) as FormArray;

    // Abilita nuovamente l'opzione per aggiungere un'entità che evoca il concetto lessicale.
    this.disableAddIsEvokedBy = false;

    // Ottiene l'entità da rimuovere.
    const entity = this.isEvokedByArray.at(index).get('entity').value;

    // Ottiene l'ID del concetto lessicale.
    let conceptId = this.object.lexicalConcept;

    // Parametri per la richiesta di eliminazione del rapporto linguistico.
    let parameters = {
      relation: 'http://www.w3.org/ns/lemon/ontolex#isEvokedBy',
      value: entity,
    };

    // Effettua la richiesta di eliminazione del rapporto linguistico solo se l'entità non è vuota.
    if (entity != '') {
      this.lexicalService
        .deleteLinguisticRelation(conceptId, parameters)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            console.log(data);
            // Aggiorna la carta principale.
            this.lexicalService.updateCoreCard(this.object);
            // Visualizza un messaggio di successo.
            this.toastr.success('Relazione rimossa', '', {
              timeOut: 5000,
            });
          },
          (error) => {
            console.log(error);
            // Visualizza un messaggio di errore e aggiorna la carta principale se lo status è 200.
            if (error.status == 200) {
              this.toastr.success('Relazione rimossa', '', {
                timeOut: 5000,
              });
            } else {
              this.toastr.error(error.error, 'Errore', {
                timeOut: 5000,
              });
            }
          }
        );
    }

    // Rimuove l'entità dall'array.
    this.isEvokedByArray.removeAt(index);

    // Rimuove l'entità dalla memoria.
    this.memoryIsEvokedBy.splice(index, 1);
  }

  /**
   * Gestisce la pulizia delle risorse quando il componente viene distrutto.
   */
  ngOnDestroy(): void {
    // Segnala la distruzione del componente e completa l'osservabile per evitare memory leak.
    this.destroy$.next(true);
    this.destroy$.complete();
  }
}
