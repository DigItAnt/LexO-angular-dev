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
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import {
  debounceTime,
  pairwise,
  startWith,
  take,
  takeUntil,
} from 'rxjs/operators';
import { LexicalEntriesService } from 'src/app/services/lexical-entries/lexical-entries.service';
import { ToastrService } from 'ngx-toastr';
import { NgSelectComponent } from '@ng-select/ng-select';
import { ConceptService } from 'src/app/services/concept/concept.service';

@Component({
  selector: 'app-sense-core-form',
  templateUrl: './sense-core-form.component.html',
  styleUrls: ['./sense-core-form.component.scss'],
})
export class SenseCoreFormComponent implements OnInit, OnDestroy {
  @Input() senseData: any;

  private subject_def: Subject<any> = new Subject();
  private subject_ex_def: Subject<any> = new Subject();

  switchInput = false;
  subscription: Subscription;
  object: any;
  peopleLoading = false;
  counter = 0;

  disableAddDef = false;

  definitionData = [];
  definitionMemory = [];

  memoryConfidence = null;

  staticDef = [];

  senseCore = new FormGroup({
    definition: new FormArray([this.createDefinition()]),
    confidence: new FormControl(null),
    usage: new FormControl('', [Validators.required, Validators.minLength(5)]),
    topic: new FormControl('', [Validators.required, Validators.minLength(5)]),
    reference: new FormArray([this.createReference()]),
    lexical_concept: new FormArray([]),
    sense_of: new FormControl('', [
      Validators.required,
      Validators.minLength(5),
    ]),
  });

  definitionArray: FormArray;
  lexicalConceptArray: FormArray;

  subject_def_subscription: Subscription;
  subject_ex_def_subscription: Subscription;
  destroy$: Subject<boolean> = new Subject();
  searchResults: any[] = [];
  filterLoading: boolean = false;
  lexical_concept_subject: Subject<any> = new Subject();
  memoryLexicalConcept: any[] = [];
  disableAddLexicalConcept: boolean;

  constructor(
    private lexicalService: LexicalEntriesService,
    private formBuilder: FormBuilder,
    private toastr: ToastrService,
    private conceptService: ConceptService
  ) {}

  // Questo metodo viene chiamato una volta all'inizio del ciclo di vita del componente.
  ngOnInit() {
    // Avvia un timeout dopo 1 secondo per inizializzare i tooltip.
    setTimeout(() => {
      //@ts-ignore
      $('.denotes-tooltip').tooltip({
        trigger: 'hover',
      });
    }, 1000);

    // Sottoscrizione al Subject per la definizione.
    this.subject_def_subscription = this.subject_def
      .pipe(debounceTime(3000), takeUntil(this.destroy$))
      .subscribe((data) => {
        this.onChangeDefinition(data);
      });

    // Sottoscrizione al Subject per la definizione esistente.
    this.subject_ex_def_subscription = this.subject_ex_def
      .pipe(debounceTime(3000), takeUntil(this.destroy$))
      .subscribe((data) => {
        this.onChangeExistingDefinition(data['evt'], data['i']);
      });

    // Sottoscrizione al Subject per il concetto lessicale.
    this.lexical_concept_subject
      .pipe(debounceTime(3000), takeUntil(this.destroy$))
      .subscribe((data) => {
        this.onSearchFilter(data);
      });

    // Inizializzazione del FormGroup per il core del senso.
    this.senseCore = this.formBuilder.group({
      definition: this.formBuilder.array([]),
      confidence: false,
      usage: '',
      topic: '',
      reference: this.formBuilder.array([this.createReference()]),
      lexical_concept: this.formBuilder.array([]),
      sense_of: '',
    });

    // Attiva il controllo dei cambiamenti nel form.
    this.onChanges();
  }

  // Questo metodo viene chiamato quando ci sono cambiamenti nei dati di input.
  ngOnChanges(changes: SimpleChanges) {
    // Avvia un timeout.
    setTimeout(() => {
      if (this.object != changes.senseData.currentValue) {
        // Pulisce gli array e le variabili di memoria se il valore dell'oggetto cambia.
        this.lexicalConceptArray = this.senseCore.get(
          'lexical_concept'
        ) as FormArray;
        this.lexicalConceptArray.clear();

        this.definitionArray = this.senseCore.get('definition') as FormArray;
        this.definitionArray.clear();

        this.staticDef = [];
        this.memoryLexicalConcept = [];
        this.memoryConfidence = [];
      }
      // Aggiorna l'oggetto con i nuovi dati.
      this.object = changes.senseData.currentValue;
      if (this.object != null) {
        // Inizializza e aggiorna i dati di definizione.
        this.definitionData = [];
        this.definitionMemory = [];
        for (var i = 0; i < this.object.definition.length; i++) {
          const pId = this.object.definition[i]['propertyID'];
          const pVal = this.object.definition[i]['propertyValue'];
          this.definitionData.push(pId);

          if (pId == 'definition' && pVal == '') {
            this.definitionMemory.push(pId);
            this.addDefinition(pId, pVal);

            this.staticDef.push({ trait: pId, value: pVal });
          }

          if (pVal != '') {
            this.definitionMemory.push(pId);
            this.addDefinition(pId, pVal);

            this.staticDef.push({ trait: pId, value: pVal });
          }
        }
        // Imposta il valore del form per la sicurezza.
        if (this.object.confidence == 0) {
          this.senseCore.get('confidence').setValue(true, { emitEvent: false });
        } else {
          this.senseCore
            .get('confidence')
            .setValue(false, { emitEvent: false });
        }
        // Imposta i valori del form per argomento e utilizzo.
        this.senseCore
          .get('topic')
          .setValue(this.object.topic, { emitEvent: false });
        this.senseCore
          .get('usage')
          .setValue(this.object.usage, { emitEvent: false });
        // Imposta il valore del form per il senso associato.
        this.senseCore
          .get('sense_of')
          .setValue(this.object.sense, { emitEvent: false });
        // Ottiene le relazioni linguistiche per il concetto lessicale.
        const senseId = this.object.sense;
        this.lexicalService
          .getLexEntryLinguisticRelation(senseId, 'isLexicalizedSenseOf')
          .pipe(takeUntil(this.destroy$))
          .subscribe(
            (data) => {
              console.log(data);
              for (var i = 0; i < data.length; i++) {
                let entity = data[i]['entity'];
                let type = data[i]['linkType'];
                let label = data[i]['label'];
                let inferred = data[i]['inferred'];
                this.addLexicalConcept(entity, type, inferred, label);
                this.memoryLexicalConcept.push(data[i]);
              }
            },
            (error) => {
              console.log(error);
            }
          );
      }
    }, 10);
  }

  /**
   * Gestisce i cambiamenti nei valori dei campi 'usage', 'confidence', 'topic' e 'reference'.
   */
  onChanges(): void {
    // Gestisce i cambiamenti nel campo 'usage'
    this.senseCore
      .get('usage')
      .valueChanges.pipe(debounceTime(3000), takeUntil(this.destroy$))
      .subscribe((newDef) => {
        this.lexicalService.spinnerAction('on');
        let senseId = this.object.sense;
        let parameters = {
          relation: 'http://www.w3.org/ns/lemon/ontolex#usage',
          value: newDef,
        };
        this.lexicalService
          .updateSense(senseId, parameters)
          .pipe(takeUntil(this.destroy$))
          .subscribe(
            (data) => {
              console.log(data);
              this.lexicalService.spinnerAction('off');
              //this.lexicalService.refreshLexEntryTree();
              this.lexicalService.updateCoreCard(this.object);
            },
            (error) => {
              console.log(error);
              //this.lexicalService.refreshLexEntryTree();
              this.lexicalService.updateCoreCard({
                lastUpdate: error.error.text,
              });
              this.lexicalService.spinnerAction('off');
              if (error.status != 200) {
                this.toastr.error(error.error, 'Error', {
                  timeOut: 5000,
                });
              } else {
                this.toastr.success('Sense usage changed', '', {
                  timeOut: 5000,
                });
              }
            }
          );
      });

    // Gestisce i cambiamenti nel campo 'confidence'
    this.senseCore
      .get('confidence')
      .valueChanges.pipe(
        debounceTime(100),
        startWith(this.senseCore.get('confidence').value),
        pairwise(),
        takeUntil(this.destroy$)
      )
      .subscribe(([prev, next]: [any, any]) => {
        let confidence_value = null;
        console.log(confidence_value);
        let senseId = this.object.sense;

        this.senseCore.get('confidence').setValue(next, { emitEvent: false });

        let oldValue = prev ? 0 : 1;
        let newValue = next ? 0 : 1;
        let parameters = {
          relation: 'http://www.lexinfo.net/ontology/3.0/lexinfo#confidence',
          value: newValue,
        };

        //if (this.memoryConfidence != null) parameters['currentValue'] = oldValue;
        this.memoryConfidence = oldValue;

        this.lexicalService
          .updateSense(senseId, parameters)
          .pipe(takeUntil(this.destroy$))
          .subscribe(
            (data) => {
              console.log(data);
            },
            (error) => {
              if (error.status == 200)
                this.toastr.success('Confidence updated', '', {
                  timeOut: 5000,
                });
              if (error.status != 200)
                this.toastr.error(error.error, '', { timeOut: 5000 });
            }
          );
      });

    // Gestisce i cambiamenti nel campo 'topic'
    this.senseCore
      .get('topic')
      .valueChanges.pipe(debounceTime(3000), takeUntil(this.destroy$))
      .subscribe((newTopic) => {
        if (newTopic.trim() != '') {
          this.lexicalService.spinnerAction('on');
          let senseId = this.object.sense;
          let parameters = {
            relation: 'http://purl.org/dc/terms/subject',
            value: newTopic,
          };
          this.lexicalService
            .updateSense(senseId, parameters)
            .pipe(takeUntil(this.destroy$))
            .subscribe(
              (data) => {
                console.log(data);
                this.lexicalService.spinnerAction('off');
                //this.lexicalService.refreshLexEntryTree();
                this.lexicalService.updateCoreCard(this.object);
                this.toastr.success('Sense topic changed', '', {
                  timeOut: 5000,
                });
              },
              (error) => {
                console.log(error);
                //this.lexicalService.refreshLexEntryTree();
                this.lexicalService.updateCoreCard({
                  lastUpdate: error.error.text,
                });
                this.lexicalService.spinnerAction('off');
                if (typeof error.error != 'object') {
                  this.toastr.error(error.error, 'Error', {
                    timeOut: 5000,
                  });
                }
              }
            );
        }
      });

    // Gestisce i cambiamenti nel campo 'reference'
    this.senseCore
      .get('reference')
      .valueChanges.pipe(debounceTime(3000), takeUntil(this.destroy$))
      .subscribe((newDef) => {
        this.lexicalService.spinnerAction('on');
        let senseId = this.object.sense;
        let parameters = {
          relation: 'http://www.w3.org/ns/lemon/ontolex#reference',
          value: newDef[0]['entity'],
        };
        //console.log(senseId)
        console.log(parameters);
        this.lexicalService
          .updateSense(senseId, parameters)
          .pipe(takeUntil(this.destroy$))
          .subscribe(
            (data) => {
              console.log(data);
              this.lexicalService.spinnerAction('off');
              //this.lexicalService.refreshLexEntryTree();
              this.lexicalService.updateCoreCard(this.object);
            },
            (error) => {
              console.log(error);
              //this.lexicalService.refreshLexEntryTree();
              this.lexicalService.updateCoreCard({
                lastUpdate: error.error.text,
              });
              this.lexicalService.spinnerAction('off');
              if (error.status != 200) {
                this.toastr.error(error.error, 'Error', {
                  timeOut: 5000,
                });
              } else {
                this.toastr.success('Sense reference changed', '', {
                  timeOut: 5000,
                });
              }
            }
          );
      });
  }

  /**
   * Gestisce l'evento di modifica di un tratto di definizione.
   * @param evt Evento dell'input
   * @param i Indice dell'elemento
   */
  onChangeDefinitionTrait(evt, i) {
    setTimeout(() => {
      this.definitionArray = this.senseCore.get('definition') as FormArray;
      this.definitionArray
        .at(i)
        .patchValue({ propertyID: evt.target.value, propertyValue: '' });
      if (evt.target.value != '') {
        // Memorizza il tratto di definizione
        this.definitionMemory[i] = evt.target.value;
      } else {
        // Rimuove il tratto di definizione dalla memoria se è vuoto
        this.definitionMemory.splice(i, 1);
      }
    }, 250);
  }

  /**
   * Crea un gruppo per il riferimento.
   * @returns FormGroup per il riferimento
   */
  createReference() {
    return this.formBuilder.group({
      entity: new FormControl(null, [
        Validators.required,
        Validators.minLength(5),
      ]),
    });
  }

  /**
   * Aggiunge un tratto di definizione al formulario.
   * @param pId ID della proprietà
   * @param pVal Valore della proprietà
   */
  addDefinition(pId?, pVal?) {
    this.definitionArray = this.senseCore.get('definition') as FormArray;
    if (pId != undefined) {
      this.definitionArray.push(this.createDefinition(pId, pVal));
    } else {
      this.disableAddDef = true;
      this.definitionArray.push(this.createDefinition());
    }
  }

  /**
   * Rimuove un tratto di definizione dal formulario.
   * @param index Indice dell'elemento
   */
  removeDefinition(index) {
    const definitionArray = this.senseCore.get('definition') as FormArray;

    const trait = this.definitionArray.at(index).get('propertyID').value;
    const value = this.definitionArray.at(index).get('propertyValue').value;

    if (trait != null) {
      // Effettua una richiesta per eliminare la relazione linguistica
      let senseId = this.object.sense;
      let parameters = {
        relation: 'http://www.lexinfo.net/ontology/3.0/lexinfo#' + trait,
        value: value,
      };
      this.lexicalService
        .deleteLinguisticRelation(senseId, parameters)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            console.log(data);
            this.lexicalService.updateCoreCard(this.object);
            // Mostra un messaggio di successo
            this.toastr.success('Definizione del senso eliminata', '', {
              timeOut: 5000,
            });
          },
          (error) => {
            console.log(error);
            this.lexicalService.updateCoreCard({
              lastUpdate: error.error.text,
            });
            if (typeof error.error != 'object') {
              // Mostra un messaggio di errore
              this.toastr.error(error.error, 'Errore', {
                timeOut: 5000,
              });
            }
          }
        );
    } else {
      this.disableAddDef = false;
    }
    // Rimuove il tratto di definizione dalla memoria e dal formulario
    this.definitionMemory.splice(index, 1);
    this.staticDef.splice(index, 1);
    definitionArray.removeAt(index);
  }

  /**
   * Gestisce l'evento keyup con debounce per una chiave esistente.
   * @param evt Evento keyup
   * @param i Indice dell'elemento
   */
  debounceExistingKeyup(evt, i) {
    this.lexicalService.spinnerAction('on');
    this.subject_ex_def.next({ evt, i });
  }

  /**
   * Gestisce l'evento keyup con debounce.
   * @param evt Evento keyup
   * @param i Indice dell'elemento
   */
  debounceKeyup(evt, i) {
    this.lexicalService.spinnerAction('on');
    this.subject_def.next({ evt, i });
  }

  /**
   * Crea un tratto di definizione nel formulario.
   * @param pId ID della proprietà
   * @param pVal Valore della proprietà
   * @returns FormGroup per il tratto di definizione
   */
  createDefinition(pId?, pVal?) {
    if (pId != undefined) {
      return this.formBuilder.group({
        propertyID: new FormControl(pId, [
          Validators.required,
          Validators.minLength(0),
        ]),
        propertyValue: new FormControl(pVal, [
          Validators.required,
          Validators.minLength(0),
        ]),
      });
    } else {
      return this.formBuilder.group({
        propertyID: new FormControl(null, [
          Validators.required,
          Validators.minLength(0),
        ]),
        propertyValue: new FormControl(null, [
          Validators.required,
          Validators.minLength(0),
        ]),
      });
    }
  }

  /**
   * Gestisce la ricerca con filtro.
   * @param data Dati per la ricerca
   */
  onSearchFilter(data) {
    this.filterLoading = true;
    this.searchResults = [];

    let value = data.value;
    let index = data.index;

    this.lexicalConceptArray = this.senseCore.get(
      'lexical_concept'
    ) as FormArray;

    if (this.object.sense != undefined) {
      let parameters = {
        text: value,
        searchMode: 'startsWith',
        labelType: 'prefLabel',
        author: '',
        offset: 0,
        limit: 500,
      };

      this.conceptService
        .conceptFilter(parameters)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            console.log(data);
            if (data.list.length > 0) {
              let filter_lang = [];
              filter_lang = data.list.filter(
                (element) => element.language != 'null'
              );
              this.searchResults = filter_lang;
              this.filterLoading = false;
            } else {
              this.filterLoading = false;
            }
          },
          (error) => {
            //console.log(error)
            this.filterLoading = false;
          }
        );
    } else {
      this.filterLoading = false;
    }
  }

  /**
   * Gestisce l'attivazione dell'evento di concetto lessicale.
   * @param evt L'evento scatenante.
   * @param i L'indice dell'elemento.
   */
  triggerLexicalConcept(evt, i) {
    console.log(evt);
    if (evt.target != undefined) {
      // Invia il valore del concetto lessicale tramite il soggetto osservabile.
      this.lexical_concept_subject.next({ value: evt.target.value, index: i });
    }
  }

  /**
   * Gestisce l'evento di modifica del concetto lessicale.
   * @param evt L'evento scatenante.
   * @param i L'indice dell'elemento.
   */
  handleLexicalConcept(evt, i) {
    if (evt instanceof NgSelectComponent) {
      if (evt.selectedItems.length > 0) {
        console.log(evt.selectedItems[0]);
        // Ottiene l'etichetta e l'etichetta predefinita selezionate e chiama onChangeLexicalConcept con i dati corrispondenti.
        let label = evt.selectedItems[0].value['lexicalConcept'];
        let prefLabel = evt.selectedItems[0].value['defaultLabel'];
        this.onChangeLexicalConcept({
          name: label,
          i: i,
          defaultLabel: prefLabel,
        });
      }
    } else {
      // Se l'evento non è un'istanza di NgSelectComponent, gestisce il valore del concetto lessicale attraverso il soggetto osservabile.
      let label = evt.target.value;
      this.lexical_concept_subject.next({ name: label, i: i });
    }
  }

  /**
   * Gestisce il cambiamento del concetto lessicale.
   * @param data I dati del cambiamento del concetto lessicale.
   */
  onChangeLexicalConcept(data) {
    var index = data['i'];
    this.lexicalConceptArray = this.senseCore.get(
      'lexical_concept'
    ) as FormArray;
    let existOrNot = this.memoryLexicalConcept.some(
      (element) => element?.entity == data.name || element?.name == data.name
    );

    if (this.memoryLexicalConcept[index] == undefined && !existOrNot) {
      // Se il concetto lessicale non esiste già, lo aggiunge e aggiorna il modello.
      let newValue = data.name;
      const parameters = {
        type: 'conceptRel',
        relation: 'http://www.w3.org/ns/lemon/ontolex#isLexicalizedSenseOf',
        value: newValue,
      };
      console.log(parameters);
      let senseId = this.object.sense;
      // Effettua la chiamata al servizio per aggiornare la relazione linguistica.
      this.lexicalService
        .updateLinguisticRelation(senseId, parameters)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            console.log(data);
            this.lexicalService.spinnerAction('off');
            data['request'] = 0;
            this.lexicalService.refreshAfterEdit(data);
            this.lexicalService.updateCoreCard(data);
            this.disableAddLexicalConcept = false;
          },
          (error) => {
            console.log(error);
            this.lexicalService.updateCoreCard({
              lastUpdate: error.error.text,
            });
            this.lexicalService.spinnerAction('off');
            if (error.status == 200) {
              this.disableAddLexicalConcept = false;
              this.toastr.success(
                'Concetto lessicale aggiunto correttamente per ' + senseId,
                '',
                {
                  timeOut: 5000,
                }
              );
              // Imposta i valori nel modello.
              this.lexicalConceptArray
                .at(index)
                .get('label')
                .setValue(data.defaultLabel, { emitEvent: false });
              this.lexicalConceptArray
                .at(index)
                .get('entity')
                .setValue(data.name, { emitEvent: false });
              this.lexicalConceptArray
                .at(index)
                .get('type')
                .setValue('internal', { emitEvent: false });
              this.lexicalConceptArray
                .at(index)
                .get('inferred')
                .setValue(false, { emitEvent: false });
            } else {
              this.toastr.error(error.error, 'Errore', {
                timeOut: 5000,
              });
            }
          }
        );
      this.memoryLexicalConcept[index] = data;
    } else if (this.memoryLexicalConcept[index] != undefined) {
      // Se il concetto esiste già, ne aggiorna il valore e aggiorna il modello.
      const oldValue =
        this.memoryLexicalConcept[index]['entity'] == undefined
          ? this.memoryLexicalConcept[index]['name']
          : this.memoryLexicalConcept[index]['entity'];
      const newValue = data['name'];
      const parameters = {
        type: 'conceptRel',
        relation: 'http://www.w3.org/ns/lemon/ontolex#isLexicalizedSenseOf',
        value: newValue,
        currentValue: oldValue,
      };
      let senseId = this.object.sense;
      console.log(parameters);
      let raw_data = data;
      // Effettua la chiamata al servizio per aggiornare la relazione linguistica.
      this.lexicalService
        .updateLinguisticRelation(senseId, parameters)
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
            this.lexicalService.updateCoreCard({
              lastUpdate: error.error.text,
            });
            this.lexicalService.spinnerAction('off');
            if (error.status == 200) {
              this.toastr.success(
                'Concetto lessicale cambiato correttamente per ' + senseId,
                '',
                {
                  timeOut: 5000,
                }
              );
              // Imposta i valori nel modello.
              this.lexicalConceptArray
                .at(index)
                .get('label')
                .setValue(raw_data.defaultLabel, { emitEvent: false });
              this.lexicalConceptArray
                .at(index)
                .get('entity')
                .setValue(raw_data.name, { emitEvent: false });
              this.lexicalConceptArray
                .at(index)
                .get('type')
                .setValue('internal', { emitEvent: false });
              this.lexicalConceptArray
                .at(index)
                .get('inferred')
                .setValue(false, { emitEvent: false });
            } else {
              this.toastr.error(error.error, 'Errore', {
                timeOut: 5000,
              });
            }
          }
        );
      this.memoryLexicalConcept[index] = data;
    } else if (existOrNot) {
      // Se il concetto esiste già, mostra un messaggio di errore.
      this.toastr.error(
        'Questo concetto lessicale esiste già in questa voce lessicale',
        'Errore',
        {
          timeOut: 5000,
        }
      );
    }
  }

  // Gestisce il cambiamento di una definizione esistente.
  onChangeExistingDefinition(evt, i) {
    // Ottiene l'array delle definizioni dal core del senso.
    this.definitionArray = this.senseCore.get('definition') as FormArray;
    // Ottiene il tratto (trait) e il nuovo valore dalla definizione corrente.
    const trait = this.definitionArray.at(i).get('propertyID').value;
    const newValue = evt.target.value;
    const senseId = this.object.sense;
    // Determina lo spazio dei nomi in base al tratto.
    let namespace =
      trait == 'definition'
        ? 'http://www.w3.org/2004/02/skos/core#'
        : 'http://www.lexinfo.net/ontology/3.0/lexinfo#';
    // Parametri per l'aggiornamento del senso.
    const parameters = {
      relation: namespace + trait,
      value: newValue,
    };

    // Se il tratto e il nuovo valore sono definiti, procedi con l'aggiornamento.
    if (trait != undefined && newValue != '') {
      // Aggiorna l'oggetto staticDef con il nuovo tratto e valore.
      this.staticDef[i] = { trait: trait, value: newValue };
      // Effettua la chiamata per aggiornare il senso nel servizio lessicale.
      this.lexicalService
        .updateSense(senseId, parameters)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            console.log(data);
            // Spegni lo spinner.
            this.lexicalService.spinnerAction('off');
            // Aggiorna la card principale del core.
            this.lexicalService.updateCoreCard(data);
          },
          (error) => {
            console.log(error);
            // Spegni lo spinner.
            this.lexicalService.spinnerAction('off');
            // Se c'è un errore durante l'aggiornamento, gestiscilo.
            if (error.status != 200) {
              this.toastr.error(error.error, 'Errore', {
                timeOut: 5000,
              });
            } else {
              this.toastr.success('Definizione del senso cambiata', '', {
                timeOut: 5000,
              });
            }
          }
        );
    } else {
      // Se il tratto o il nuovo valore non sono definiti, spegni lo spinner e aggiorna staticDef.
      this.lexicalService.spinnerAction('off');
      this.staticDef[i] = { trait: trait, value: '' };
    }
  }

  // Gestisce il cambiamento di una definizione.
  onChangeDefinition(object) {
    // Ottiene l'array delle definizioni dal core del senso.
    this.definitionArray = this.senseCore.get('definition') as FormArray;
    // Ottiene il tratto e il nuovo valore dalla definizione corrente.
    const trait = this.definitionArray.at(object.i).get('propertyID').value;
    const newValue = object.evt.target.value;
    const senseId = this.object.sense;
    // Determina lo spazio dei nomi in base al tratto.
    let namespace =
      trait == 'definition'
        ? 'http://www.w3.org/2004/02/skos/core#'
        : 'http://www.lexinfo.net/ontology/3.0/lexinfo#';
    // Parametri per l'aggiornamento del senso.
    const parameters = { relation: namespace + trait, value: newValue };

    // Se il tratto è definito, procedi con l'aggiornamento.
    if (trait != undefined) {
      // Aggiunge il tratto e il valore a staticDef.
      this.staticDef.push({ trait: trait, value: newValue });
      // Effettua la chiamata per aggiornare il senso nel servizio lessicale.
      this.lexicalService
        .updateSense(senseId, parameters)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            console.log(data);
            // Spegni lo spinner.
            this.lexicalService.spinnerAction('off');
            // Aggiorna la card principale del core.
            this.lexicalService.updateCoreCard(data);
            // Abilita l'aggiunta di una nuova definizione.
            this.disableAddDef = false;
          },
          (error) => {
            console.log(error);
            // Abilita l'aggiunta di una nuova definizione.
            this.disableAddDef = false;
            // Se c'è un errore durante l'aggiornamento, gestiscilo.
            if (error.status != 200) {
              this.toastr.error(error.error, 'Errore', {
                timeOut: 5000,
              });
              this.lexicalService.spinnerAction('off');
            } else {
              // Se l'aggiornamento è avvenuto correttamente, gestiscilo.
              if (trait == 'definition') {
                const data = this.object;
                data['whatToSearch'] = 'sense';
                data['new_definition'] = newValue;
                data['request'] = 6;
                this.lexicalService.refreshAfterEdit(data);
              }
              this.lexicalService.updateCoreCard({
                lastUpdate: error.error.text,
              });
              this.lexicalService.spinnerAction('off');
              this.toastr.success('Senso ' + trait + ' cambiato', '', {
                timeOut: 5000,
              });
            }
          }
        );
    } else {
      // Se il tratto non è definito, spegni lo spinner.
      this.lexicalService.spinnerAction('off');
    }
  }

  // Rimuove un riferimento dall'array dei riferimenti.
  removeReference(index) {
    const referenceArray = this.senseCore.get('reference') as FormArray;
    referenceArray.removeAt(index);
  }

  // Crea un gruppo per un concetto lessicale.
  createLexicalConcept(e?, t?, i?, l?) {
    if (e != undefined) {
      return this.formBuilder.group({
        entity: e,
        inferred: i,
        label: l,
        type: t,
      });
    } else {
      return this.formBuilder.group({
        entity: '',
        inferred: false,
        label: '',
        type: null,
      });
    }
  }

  // Aggiunge un concetto lessicale all'array dei concetti lessicali.
  addLexicalConcept(entity?, type?, inferred?, label?) {
    this.lexicalConceptArray = this.senseCore.get(
      'lexical_concept'
    ) as FormArray;
    if (entity != undefined) {
      this.lexicalConceptArray.push(
        this.createLexicalConcept(entity, type, inferred, label)
      );
    } else {
      this.disableAddLexicalConcept = true;
      this.lexicalConceptArray.push(this.createLexicalConcept());
    }
  }

  // Rimuove un concetto lessicale dall'array dei concetti lessicali.
  removeLexicalConcept(index) {
    this.lexicalConceptArray = this.senseCore.get(
      'lexical_concept'
    ) as FormArray;
    // Abilita l'aggiunta di un nuovo concetto lessicale.
    this.disableAddLexicalConcept = false;
    const entity = this.lexicalConceptArray.at(index).get('entity').value;
    let senseId = this.object.sense;
    let parameters = {
      relation: 'http://www.w3.org/ns/lemon/ontolex#isLexicalizedSenseOf',
      value: entity,
    };

    // Se l'entità è definita, procedi con la rimozione.
    if (entity != '') {
      this.lexicalService
        .deleteLinguisticRelation(senseId, parameters)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            console.log(data);
            // Aggiorna la card principale del core.
            this.lexicalService.updateCoreCard(this.object);
            this.toastr.success('Concetto lessicale rimosso', '', {
              timeOut: 5000,
            });
          },
          (error) => {
            console.log(error);
            if (error.status == 200) {
              this.toastr.success(
                'Concetto lessicale eliminato correttamente',
                'Errore',
                {
                  timeOut: 5000,
                }
              );
            } else {
              this.toastr.error(error.error, 'Errore', {
                timeOut: 5000,
              });
            }
          }
        );
    }

    // Rimuove il concetto lessicale dall'array e dalla memoria.
    this.lexicalConceptArray.removeAt(index);
    this.memoryLexicalConcept.splice(index, 1);
  }

  // Si occupa della pulizia delle sottoscrizioni e della distruzione del componente.
  ngOnDestroy(): void {
    this.subject_def_subscription.unsubscribe();
    this.subject_ex_def_subscription.unsubscribe();

    this.destroy$.next(true);
    this.destroy$.complete();
  }
}
