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
import { FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { NgSelectComponent } from '@ng-select/ng-select';
import { ToastrService } from 'ngx-toastr';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { LexicalEntriesService } from 'src/app/services/lexical-entries/lexical-entries.service';

@Component({
  selector: 'app-lexical-entry-decomp-form',
  templateUrl: './lexical-entry-decomp-form.component.html',
  styleUrls: ['./lexical-entry-decomp-form.component.scss'],
})
export class LexicalEntryDecompFormComponent implements OnInit, OnDestroy {
  @Input() decData: any;
  private subterm_subject: Subject<any> = new Subject();
  private ext_subterm_subject: Subject<any> = new Subject();
  private corresponds_subject: Subject<any> = new Subject();
  private update_component_subject: Subject<any> = new Subject();
  switchInput = false;
  subscription: Subscription;
  object: any;
  searchResults = [];
  peopleLoading = false;
  counter = 0;
  componentRef: any;

  subtermDisabled = false;
  memorySubterm = [];
  memoryComponent = [];
  memoryValues = [];

  decompForm = new FormGroup({
    label: new FormControl(''),
    component: new FormArray([this.createComponent()]),
    subterm: new FormArray([this.createSubtermComponent()]),
  });

  componentArray: FormArray;
  subtermArray: FormArray;
  destroy$: Subject<boolean> = new Subject();
  staticMorpho = [];
  morphologyData = [];
  valueTraits = [];

  disableAddTraits = [];

  change_decomp_label_subscription: Subscription;
  subterm_subject_subscription: Subscription;
  ext_subterm_subject_subscription: Subscription;
  corresponds_subject_subscription: Subscription;
  update_component_subject_subscription: Subscription;

  constructor(
    private lexicalService: LexicalEntriesService,
    private formBuilder: FormBuilder,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    // Inizializza il form di decompilazione
    this.decompForm = this.formBuilder.group({
      label: '',
      component: this.formBuilder.array([]),
      subterm: this.formBuilder.array([]),
    });

    // Attiva il tooltip dopo un breve ritardo
    this.triggerTooltip();

    // Carica i dati sulla morfologia
    this.loadMorphologyData();

    // Sottoscrivi ai cambiamenti dell'etichetta di decompilazione
    this.change_decomp_label_subscription =
      this.lexicalService.changeDecompLabel$.subscribe((data) => {
        if (data != null) {
          this.decompForm.get('label').setValue(data, { emitEvent: false });
        }
      });

    // Sottoscrivi ai dati sull'argomento
    this.subterm_subject_subscription = this.subterm_subject
      .pipe(debounceTime(3000), takeUntil(this.destroy$))
      .subscribe((data) => {
        this.onSearchFilter(data);
      });

    // Sottoscrivi ai dati esterni sull'argomento
    this.ext_subterm_subject_subscription = this.ext_subterm_subject
      .pipe(debounceTime(3000), takeUntil(this.destroy$))
      .subscribe((data) => {
        this.onChangeSubterm(data);
      });

    // Sottoscrivi ai dati corrispondenti
    this.corresponds_subject_subscription = this.corresponds_subject
      .pipe(debounceTime(3000), takeUntil(this.destroy$))
      .subscribe((data) => {
        this.onSearchFilter(data);
      });

    // Sottoscrivi ai dati di aggiornamento dei componenti
    this.update_component_subject_subscription = this.update_component_subject
      .pipe(debounceTime(3000), takeUntil(this.destroy$))
      .subscribe((data) => {
        this.onChanges(data);
      });
  }

  // Attiva il tooltip dopo un breve ritardo
  triggerTooltip() {
    setTimeout(() => {
      //@ts-ignore
      $('.vartrans-tooltip').tooltip({
        trigger: 'hover',
      });
    }, 500);
  }

  // Carica i dati sulla morfologia
  async loadMorphologyData() {
    try {
      let get_morpho_data = await this.lexicalService
        .getMorphologyData()
        .toPromise();
      console.log(get_morpho_data);
      this.morphologyData = get_morpho_data;
    } catch (error) {
      console.log(error);
      if (error.status != 200) {
        this.toastr.error(
          'Errore nel recupero dei dati sulla morfologia, controlla il log',
          'Errore',
          { timeOut: 5000 }
        );
      }
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    setTimeout(() => {
      if (this.object != changes.decData.currentValue) {
        if (this.componentArray != null || this.subtermArray != null) {
          if (this.componentArray != undefined) {
            this.componentArray.clear();
          }

          if (this.subtermArray != undefined) {
            this.subtermArray.clear();
          }

          this.subtermDisabled = false;
          this.memorySubterm = [];
          this.memoryComponent = [];
          /* this.morphologyData = []; */
          /* this.staticMorpho = []; */
          this.valueTraits = [];
          this.memoryValues = [];
        }
      }
      /* this.loadPeople(); */
      this.object = changes.decData.currentValue;
      if (this.object != null) {
        this.decompForm
          .get('label')
          .setValue(this.object.label, { emitEvent: false });
        if (
          this.object.lexicalEntryInstanceName != undefined &&
          this.object.sense == undefined
        ) {
          let lexId = this.object.lexicaleEntryInstanceName;
          this.getSubterms(lexId);
          this.getConstituents(lexId);
        }
      }
      this.triggerTooltip();
    }, 10);
  }

  // Ottieni i sottoargomenti
  async getSubterms(lexId) {
    try {
      let get_subterms_req = await this.lexicalService
        .getSubTerms(this.object.lexicalEntryInstanceName)
        .toPromise();
      if (get_subterms_req != undefined) {
        Array.from(get_subterms_req).forEach((element: any) => {
          this.addSubterm(
            element.lexicalEntryInstanceName,
            element.label,
            element.language
          );
          this.memorySubterm.push(element);
        });
      }
    } catch (error) {
      console.log(error);
      if (error.status != 200) {
        this.toastr.error(
          'Qualcosa è andato storto nel recupero dei sottoargomenti, controlla il log',
          'Errore',
          { timeOut: 5000 }
        );
      }
    }
  }

  // Ottieni i costituenti
  async getConstituents(lexId) {
    try {
      let get_constituents_req = await this.lexicalService
        .getConstituents(this.object.lexicalEntryInstanceName)
        .toPromise();
      for (const element of get_constituents_req) {
        try {
          let get_corresponds_to_req = await this.lexicalService
            .getCorrespondsTo(element.componentInstanceName)
            .toPromise();
          console.log(get_corresponds_to_req);
          let corr;
          if (get_corresponds_to_req != undefined) {
            corr = get_corresponds_to_req.lexicalEntryInstanceName;
          }
          element.corresponds_to = corr;
          this.addComponent(
            element,
            Array.from(get_corresponds_to_req).indexOf(element)
          );
        } catch (error) {}
      }
    } catch (error) {
      console.log(error);
      if (error.status != 200) {
        this.toastr.error(
          'Qualcosa è andato storto nel recupero dei costituenti, controlla il log',
          'Errore',
          { timeOut: 5000 }
        );
      }
    }
  }

  /**
   * Questa funzione gestisce gli eventi di cambiamento dei dati.
   * @param data I dati relativi all'evento di cambiamento.
   */
  async onChanges(data) {
    let fieldType = ''; // Tipo di campo
    console.log(data); // Stampa dei dati ricevuti

    if (data != undefined) {
      // Se ci sono dati ricevuti

      let newValue = data.v.target.value; // Nuovo valore ricevuto dall'evento
      let currentValue; // Valore corrente
      let index = data?.i; // Indice dell'elemento modificato

      let oldValue = ''; // Vecchio valore
      fieldType = data['f']; // Tipo di campo modificato (nota, etichetta o confidenza)

      // Determina il vecchio valore in base al tipo di campo
      if (fieldType == 'note') {
        oldValue = this.memoryComponent[index]['note'];
      } else if (fieldType == 'label') {
        oldValue = this.memoryComponent[index]['label'];
      } else if (fieldType == 'confidence') {
        oldValue = this.memoryComponent[index]['confidence'];
      }

      let instanceName = this.memoryComponent[index].componentInstanceName; // Nome dell'istanza del componente modificato
      let parameters; // Parametri per l'aggiornamento

      // Se il vecchio valore è vuoto o nullo, imposta solo il nuovo valore
      if (oldValue == '' || oldValue == null) {
        parameters = {
          type: 'decomp',
          relation: fieldType,
          value: newValue,
        };
      } else {
        // Altrimenti, include sia il vecchio che il nuovo valore
        parameters = {
          type: 'decomp',
          relation: fieldType,
          value: newValue,
          currentValue: oldValue,
        };
      }

      // Se il campo è di tipo "confidence" e il vecchio valore è "-1"
      if (fieldType == 'confidence' && oldValue == '-1') {
        // Aggiusta il nuovo valore per essere in accordo con i valori previsti
        if (newValue == 'true') {
          newValue = 0;
        } else if (newValue == 'false') {
          newValue = -1;
        }
        parameters = {
          type: 'confidence',
          relation: fieldType,
          value: newValue,
        };
      } else if (fieldType == 'confidence' && oldValue != '-1') {
        // Se il campo è di tipo "confidence" ma il vecchio valore non è "-1"
        // Aggiusta il nuovo valore come sopra
        if (newValue == 'true') {
          newValue = 0;
        } else if (newValue == 'false') {
          newValue = -1;
        }
        parameters = {
          type: 'confidence',
          relation: fieldType,
          value: newValue,
          currentValue: oldValue,
        };
      }

      console.log(parameters); // Stampa dei parametri per l'aggiornamento

      try {
        // Esegue la richiesta di aggiornamento e attende la risposta
        let update_comp_req = await this.lexicalService
          .updateGenericRelation(instanceName, parameters)
          .toPromise();
        console.log(update_comp_req); // Stampa della risposta
        this.lexicalService.spinnerAction('off'); // Disattiva lo spinner
        this.toastr.success('Component updated', '', {
          // Mostra un messaggio di successo
          timeOut: 5000,
        });

        // Aggiorna i valori memorizzati in base al tipo di campo
        if (fieldType == 'note') {
          this.memoryComponent[index]['note'] = newValue;
        } else if (fieldType == 'label') {
          this.memoryComponent[index]['label'] = newValue;
        } else if (fieldType == 'confidence') {
          this.memoryComponent[index]['confidence'] = newValue;
        }
      } catch (error) {
        // Se si verifica un errore durante l'aggiornamento
        this.lexicalService.spinnerAction('off'); // Disattiva lo spinner
        if (error.status == 200) {
          // Se lo stato dell'errore è 200 (OK)
          this.toastr.success('Component item updated', '', {
            // Mostra un messaggio di successo
            timeOut: 5000,
          });
          // Aggiorna i valori memorizzati e i controlli del form in base al tipo di campo
          if (fieldType == 'note') {
            this.memoryComponent[index]['note'] = newValue;
            (<FormArray>this.decompForm.controls['component'])
              .at(index)
              .get('note')
              .setValue(newValue, { emitEvent: false });
          } else if (fieldType == 'label') {
            this.memoryComponent[index]['label'] = newValue;
            (<FormArray>this.decompForm.controls['component'])
              .at(index)
              .get('label')
              .setValue(newValue, { emitEvent: false });
          } else if (fieldType == 'confidence') {
            this.memoryComponent[index]['confidence'] = newValue;
            (<FormArray>this.decompForm.controls['component'])
              .at(index)
              .get('confidence')
              .setValue(newValue, { emitEvent: false });
          }
        } else {
          // Se lo stato dell'errore non è 200
          this.toastr.error(error.error, 'Error', {
            // Mostra un messaggio di errore
            timeOut: 5000,
          });
        }
      }
    }
  }

  /**
   * Gestisce l'evento di cambiamento di valore all'interno di una matrice di componenti.
   * @param i Indice della riga all'interno della matrice di componenti.
   * @param j Indice della colonna all'interno della matrice di componenti.
   */
  async onChangeValue(i, j) {
    // Attiva lo spinner di caricamento.
    this.lexicalService.spinnerAction('on');

    // Ottiene il controllo corrispondente alla relazione nella formArray.
    const control = (<FormArray>this.decompForm.controls['component'])
      .at(i)
      .get('relation') as FormArray;

    // Ottiene il valore del tratto e il valore corrispondente.
    const trait = control.at(j).get('trait').value;
    const value = control.at(j).get('value').value;

    // Verifica se il tratto e il valore non sono vuoti.
    if (trait != '' && value != '') {
      let parameters;

      // Se il valore precedente nella memoria è vuoto, imposta i parametri per la creazione di una nuova relazione.
      if (this.memoryValues[i][j] == '') {
        parameters = {
          type: 'morphology',
          relation: trait,
          value: value,
        };
      }

      // Ottiene l'ID del componente corrente.
      let compId = this.memoryComponent[i].componentInstanceName;

      // Se il tratto memorizzato è diverso dal tratto attuale e non è vuoto, gestisce l'aggiornamento della relazione.
      if (
        this.memoryComponent[i].morphology[j] != trait &&
        this.memoryComponent[i].morphology[j] != ''
      ) {
        let delete_old_param = {
          type: 'morphology',
          relation: this.memoryComponent[i].morphology[j],
          value: this.memoryValues[i][j][0],
        };

        parameters = {
          type: 'morphology',
          relation: trait,
          value: value,
        };

        try {
          let delete_req = await this.lexicalService
            .deleteLinguisticRelation(compId, delete_old_param)
            .toPromise();

          try {
            let change_morpho_value_req = await this.lexicalService
              .updateLinguisticRelation(compId, parameters)
              .toPromise();
            change_morpho_value_req['request'] = 0;
            this.lexicalService.refreshAfterEdit(change_morpho_value_req);
            this.lexicalService.spinnerAction('off');
            this.lexicalService.refreshFilter({ request: true });

            this.memoryComponent[i].morphology[j] = trait;
            control.at(j).patchValue({ trait: trait, value: value });
            this.disableAddTraits[i] = false;
            setTimeout(() => {
              let traitDescription = '';
              this.morphologyData.filter((x) => {
                if (x.propertyId == trait) {
                  x.propertyValues.filter((y) => {
                    if (y.valueId == value) {
                      traitDescription = y.valueDescription;
                      return true;
                    } else {
                      return false;
                    }
                  });
                  return true;
                } else {
                  return false;
                }
              });
              //@ts-ignore
              $('.trait-tooltip').tooltip({
                trigger: 'hover',
              });
            }, 1000);
          } catch (error) {
            // Gestisce l'errore nell'aggiornamento della relazione.
            this.lexicalService.refreshAfterEdit({
              request: 0,
              label: this.object.label,
            });
            this.lexicalService.spinnerAction('off');
            this.lexicalService.refreshFilter({ request: true });

            this.memoryComponent[i].morphology[j] = trait;
            control.at(j).patchValue({ trait: trait, value: value });
            this.disableAddTraits[i] = false;
            setTimeout(() => {
              let traitDescription = '';
              this.morphologyData.filter((x) => {
                if (x.propertyId == trait) {
                  x.propertyValues.filter((y) => {
                    if (y.valueId == value) {
                      traitDescription = y.valueDescription;
                      return true;
                    } else {
                      return false;
                    }
                  });
                  return true;
                } else {
                  return false;
                }
              });
              //@ts-ignore
              $('.trait-tooltip').tooltip({
                trigger: 'hover',
              });
              // Visualizza un messaggio di errore appropriato.
              if (typeof error.error != 'object') {
                this.toastr.error(error.error, 'Error', {
                  timeOut: 5000,
                });
              } else {
                this.toastr.success(
                  'Morphotraits changed correctly for ' + compId,
                  '',
                  {
                    timeOut: 5000,
                  }
                );
              }
            }, 1000);
          }
        } catch (error) {
          // Gestisce l'errore nell'aggiornamento della relazione.
          console.log(error);
          if (error.status != 200) {
            this.toastr.error(
              'Something went wrong on updating components, please check the log',
              'Error',
              { timeOut: 5000 }
            );
          }
        }
      } else if (
        this.memoryComponent[i].morphology[j] == trait &&
        this.memoryComponent[i].morphology[j] != ''
      ) {
        // Se il tratto è lo stesso, ma il valore è cambiato, aggiorna il valore della relazione.
        parameters = {
          type: 'morphology',
          relation: trait,
          value: value,
          currentValue: this.memoryValues[i][j][0],
        };
        try {
          let change_morpho_value_req = await this.lexicalService
            .updateLinguisticRelation(compId, parameters)
            .toPromise();
          change_morpho_value_req['request'] = 0;
          this.lexicalService.refreshAfterEdit(change_morpho_value_req);
          this.lexicalService.spinnerAction('off');
          this.lexicalService.refreshFilter({ request: true });

          this.memoryComponent[i].morphology[j] = trait;
          control.at(j).patchValue({ trait: trait, value: value });
          this.disableAddTraits[i] = false;
          setTimeout(() => {
            let traitDescription = '';
            this.morphologyData.filter((x) => {
              if (x.propertyId == trait) {
                x.propertyValues.filter((y) => {
                  if (y.valueId == value) {
                    traitDescription = y.valueDescription;
                    return true;
                  } else {
                    return false;
                  }
                });
                return true;
              } else {
                return false;
              }
            });
            //@ts-ignore
            $('.trait-tooltip').tooltip({
              trigger: 'hover',
            });
          }, 1000);
        } catch (error) {
          // Gestisce l'errore nell'aggiornamento della relazione.
          console.log(error);
          if (error.status == 200) {
            this.lexicalService.refreshAfterEdit({
              request: 0,
              label: this.object.label,
            });
            this.lexicalService.spinnerAction('off');
            this.lexicalService.refreshFilter({ request: true });

            this.memoryComponent[i].morphology[j] = trait;
            control.at(j).patchValue({ trait: trait, value: value });
            this.disableAddTraits[i] = false;
            setTimeout(() => {
              let traitDescription = '';
              this.morphologyData.filter((x) => {
                if (x.propertyId == trait) {
                  x.propertyValues.filter((y) => {
                    if (y.valueId == value) {
                      traitDescription = y.valueDescription;
                      return true;
                    } else {
                      return false;
                    }
                  });
                  return true;
                } else {
                  return false;
                }
              });
              //@ts-ignore
              $('.trait-tooltip').tooltip({
                trigger: 'hover',
              });
              // Visualizza un messaggio di errore appropriato.
              if (typeof error.error != 'object') {
                this.toastr.error(error.error, 'Error', {
                  timeOut: 5000,
                });
              } else {
                this.toastr.success(
                  'Morphotraits changed correctly for ' + compId,
                  '',
                  {
                    timeOut: 5000,
                  }
                );
              }
            }, 1000);
          } else {
            this.toastr.error(
              'Error on updating components, please check the log',
              'Error',
              { timeOut: 5000 }
            );
          }
        }
      } else if (this.memoryComponent[i].morphology[j] == '') {
        // Se il tratto è vuoto, aggiorna la relazione.
        console.log(parameters);

        try {
          let update_comp_req = await this.lexicalService
            .updateLinguisticRelation(compId, parameters)
            .toPromise();
          update_comp_req['request'] = 0;
          this.lexicalService.refreshAfterEdit(update_comp_req);
          this.lexicalService.spinnerAction('off');
          this.lexicalService.refreshFilter({ request: true });

          this.memoryComponent[i].morphology[j] = trait;
          control.at(j).patchValue({ trait: trait, value: value });
          this.disableAddTraits[i] = false;
          setTimeout(() => {
            let traitDescription = '';
            this.morphologyData.filter((x) => {
              if (x.propertyId == trait) {
                x.propertyValues.filter((y) => {
                  if (y.valueId == value) {
                    traitDescription = y.valueDescription;
                    return true;
                  } else {
                    return false;
                  }
                });
                return true;
              } else {
                return false;
              }
            });
            //@ts-ignore
            $('.trait-tooltip').tooltip({
              trigger: 'hover',
            });
          }, 1000);
        } catch (error) {
          // Gestisce l'errore nell'aggiornamento della relazione.
          if (error.status == 200) {
            this.lexicalService.refreshAfterEdit({
              request: 0,
              label: this.object.label,
            });
            this.lexicalService.spinnerAction('off');
            this.lexicalService.refreshFilter({ request: true });

            this.memoryComponent[i].morphology[j] = trait;
            control.at(j).patchValue({ trait: trait, value: value });
            this.disableAddTraits[i] = false;
            setTimeout(() => {
              let traitDescription = '';
              this.morphologyData.filter((x) => {
                if (x.propertyId == trait) {
                  x.propertyValues.filter((y) => {
                    if (y.valueId == value) {
                      traitDescription = y.valueDescription;
                      return true;
                    } else {
                      return false;
                    }
                  });
                  return true;
                } else {
                  return false;
                }
              });
              //@ts-ignore
              $('.trait-tooltip').tooltip({
                trigger: 'hover',
              });
              // Visualizza un messaggio di errore appropriato.
              if (typeof error.error != 'object') {
                this.toastr.error(error.error, 'Error', {
                  timeOut: 5000,
                });
              } else {
                this.toastr.success(
                  'Morphotraits changed correctly for ' + compId,
                  '',
                  {
                    timeOut: 5000,
                  }
                );
              }
            }, 1000);
          } else {
            this.toastr.error(
              'Error on updating components, please check the log',
              'Error',
              { timeOut: 5000 }
            );
          }
        }
      }
    } else {
      // Disattiva lo spinner di caricamento e reimposta lo stato dei tratti da aggiungere.
      this.lexicalService.spinnerAction('off');
      this.disableAddTraits[i] = false;
    }
  }

  // Gestisce il cambio dei tratti nelle relazioni tra componenti
  onChangeTrait(evt, i, j) {
    // Controlla se l'evento ha un target definito
    if (evt.target != undefined) {
      // Imposta un ritardo per gestire l'evento
      setTimeout(() => {
        // Ottiene il controllo della relazione specifica
        const control = (<FormArray>this.decompForm.controls['component'])
          .at(i)
          .get('relation') as FormArray;
        // Aggiorna il valore del tratto e resetta il valore associato
        control.at(j).patchValue({ trait: evt.target.value, value: '' });
        // Se il tratto selezionato non è vuoto, filtra i valori di morfologia corrispondenti
        if (evt.target.value != '') {
          let arrayValues = this.morphologyData.filter((x) => {
            return x['propertyId'] == evt.target.value;
          })['0']['propertyValues'];
          this.valueTraits[i][j] = arrayValues; // Aggiorna l'array dei valori di tratti
        } else {
          // Se il tratto è vuoto, resetta i valori corrispondenti
          this.memoryValues.splice(i, 1);
          let arrayValues = [];
          this.valueTraits[i][j] = arrayValues;
          this.memoryComponent[i]['morphology'][j].splice(j, 1); // Rimuove il tratto dalla memoria
        }
      }, 500);
    } else {
      // Gestisce il caso in cui l'evento non abbia un target definito
      var that = this;
      var timer = setInterval((val) => {
        try {
          var arrayValues = this.morphologyData.filter((x) => {
            return x['propertyId'] == evt;
          })['0']['propertyValues'];
          this.valueTraits[i][j] = arrayValues; // Aggiorna i valori dei tratti
          this.memoryComponent[i].morphology[j].push(evt); // Aggiunge il tratto alla memoria
          clearInterval(timer); // Interrompe il timer
        } catch (e) {
          console.log(e);
        }
      }, 500);
    }
  }

  // Aggiunge un sottotermino al form
  addSubterm(e?, label?, lang?) {
    // Ottiene l'array dei sottotermini dal form
    this.subtermArray = this.decompForm.get('subterm') as FormArray;
    // Controlla se esiste un evento: in tal caso, crea un nuovo sottotermino con i dati specificati
    if (e != undefined) {
      this.subtermArray.push(this.createSubtermComponent(e, label, lang));
      this.subtermDisabled = false; // Abilita l'aggiunta di sottotermini
    } else {
      // Se non ci sono dati, crea un sottotermino vuoto e disabilita ulteriori aggiunte
      this.subtermArray.push(this.createSubtermComponent());
      this.subtermDisabled = true;
    }
  }

  // Aggiunge un componente al form
  async addComponent(element?, index?) {
    // Controlla se l'istanza del lexical entry è definita e se non è specificato un elemento
    if (
      this.object.lexicalEntryInstanceName != undefined &&
      element == undefined
    ) {
      let instance = this.object.lexicalEntryInstanceName; // Ottiene il nome dell'istanza
      this.object['request'] = 'constituent'; // Imposta la richiesta come costituente

      try {
        // Crea un componente tramite il servizio lexical
        let create_comp_req = await this.lexicalService
          .createComponent(instance)
          .toPromise();
        console.log(create_comp_req); // Stampa la risposta

        // Destruttura la risposta per ottenere i dati del componente
        let {
          componentInstanceName: compId,
          component: componentURI,
          creator,
          creationDate,
          lastUpdate,
          confidence,
        } = create_comp_req;
        let label = '';
        let note = '';
        let position = create_comp_req.position;

        // Invia una richiesta di aggiunta sottocomponente
        this.lexicalService.addSubElementRequest({
          lex: this.object,
          data: create_comp_req,
        });

        // Aggiunge il nuovo componente al form
        this.componentArray = this.decompForm.get('component') as FormArray;
        this.componentArray.push(
          this.createComponent(
            compId,
            componentURI,
            confidence,
            creator,
            label,
            creationDate,
            lastUpdate,
            [],
            note,
            position
          )
        );

        // Inizializza la morfologia del componente nella memoria
        create_comp_req['morphology'] = [];
        this.memoryComponent.push(create_comp_req); // Aggiunge alla memoria del componente

        // Notifica la creazione del componente
        this.toastr.success('Component created correctly', 'Success', {
          timeOut: 5000,
        });
      } catch (error) {
        console.log(error); // Stampa l'errore in caso di fallimento
        // Gestisce gli errori non legati a una risposta di successo
        if (error.status != 200) {
          this.toastr.error('Something went wrong', 'Error', {
            timeOut: 5000,
          });
        }
      }
    } else if (element != undefined) {
      // Se è specificato un elemento, ne estrae i dati per aggiungerlo al form
      let {
        componentInstanceName: compId,
        component: componentURI,
        creator,
        label,
        creationDate,
        lastUpdate,
        note,
        position,
        corresponds_to: corr_to,
        confidence,
        morphology,
      } = element;

      // Aggiunge il componente specificato al form
      this.componentArray = this.decompForm.get('component') as FormArray;
      this.componentArray.push(
        this.createComponent(
          compId,
          componentURI,
          confidence,
          creator,
          label,
          creationDate,
          lastUpdate,
          [],
          note,
          position,
          corr_to
        )
      );

      // Inizializza la morfologia del componente specificato nella memoria
      element.morphology = [];
      this.memoryComponent.push(element); // Aggiunge alla memoria del componente

      // Se la morfologia contiene elementi, aggiunge le relazioni
      if (morphology.length > 0) {
        this.addRelation(index, morphology);
      }
    }
  }

  // Rimuove un componente dal form
  async removeComponent(index) {
    this.componentArray = this.decompForm.get('component') as FormArray; // Ottiene l'array dei componenti
    const control = this.componentArray.at(index); // Ottiene il controllo del componente specifico

    if (control != null) {
      let idComp = control.get('id').value; // Ottiene l'ID del componente

      try {
        // Tenta di eliminare il componente tramite il servizio lexical
        let delete_comp_req = await this.lexicalService
          .deleteComponent(idComp)
          .toPromise();
        console.log(delete_comp_req); // Stampa la risposta
        // Effettua una richiesta per eliminare il componente
        this.lexicalService.deleteRequest({ componentInstanceName: idComp });
        // Notifica l'eliminazione del componente
        this.toastr.info('Component ' + idComp + ' deleted', 'Info', {
          timeOut: 5000,
        });
      } catch (error) {
        // Gestisce gli errori non legati a una risposta di successo
        if (error.status != 200) {
          console.log(error);
          this.lexicalService.deleteRequest({ componentInstanceName: idComp });
          this.toastr.error(
            'Something went wrong, please check the log',
            'Error',
            {
              timeOut: 5000,
            }
          );
        }
      }
    }
    // Rimuove il componente dalla memoria e dall'array del form
    this.memoryComponent.splice(index, 1);
    this.componentArray.removeAt(index);
  }

  // Aggiunge una relazione a un componente
  addRelation(index, morphologyArray?) {
    // Gestisce il caso senza specifica morfologia, inizializzando valori di default
    if (morphologyArray == undefined) {
      this.memoryComponent[index].morphology.push(''); // Aggiunge un elemento vuoto alla morfologia

      // Inizializza gli array se non esistono
      if (this.valueTraits[index] == undefined) {
        this.valueTraits[index] = [];
        this.valueTraits[index].push([]);
      } else {
        this.valueTraits[index].push([]);
      }

      if (this.memoryValues[index] == undefined) {
        this.memoryValues[index] = [];
        this.memoryValues[index].push([]);
      } else {
        this.memoryValues[index].push([]);
      }

      // Imposta la disabilitazione dell'aggiunta di nuovi tratti
      if (this.disableAddTraits[index] == undefined) {
        this.disableAddTraits[index] = true;
      } else {
        this.disableAddTraits[index] = true;
      }

      // Aggiunge un nuovo controllo di relazione al form
      const control = (<FormArray>this.decompForm.controls['component'])
        .at(index)
        .get('relation') as FormArray;
      control.push(this.createRelation());
    } else {
      // Gestisce il caso con morfologia specifica, aggiungendo valori per ciascun elemento
      morphologyArray.forEach((element) => {
        this.memoryComponent[index].morphology.push(element.trait); // Aggiunge il tratto alla morfologia

        // Inizializza e aggiorna i valori dei tratti e dei valori di memoria
        if (this.valueTraits[index] == undefined) {
          this.valueTraits[index] = [];
          var timer1 = setInterval((val) => {
            try {
              var arrayValues = this.morphologyData.filter((x) => {
                return x['propertyId'] == element.trait;
              })['0']['propertyValues'];
              this.valueTraits[index].push(arrayValues); // Aggiorna i valori dei tratti
              clearInterval(timer1); // Interrompe il timer
            } catch (e) {
              console.log(e);
            }
          }, 500);
        } else {
          var timer2 = setInterval((val) => {
            try {
              var arrayValues = this.morphologyData.filter((x) => {
                return x['propertyId'] == element.trait;
              })['0']['propertyValues'];
              this.valueTraits[index].push(arrayValues); // Aggiorna i valori dei tratti
              clearInterval(timer2); // Interrompe il timer
            } catch (e) {
              console.log(e);
            }
          }, 500);
        }

        if (this.memoryValues[index] == undefined) {
          this.memoryValues[index] = [];
          this.memoryValues[index].push([element.value]);
        } else {
          this.memoryValues[index].push([element.value]);
        }

        // Imposta la disabilitazione dell'aggiunta di nuovi tratti in base alla presenza di valori
        if (this.disableAddTraits[index] == undefined) {
          this.disableAddTraits[index] = false;
        } else {
          this.disableAddTraits[index] = false;
        }

        // Aggiunge un nuovo controllo di relazione al form per ogni elemento della morfologia
        const control = (<FormArray>this.decompForm.controls['component'])
          .at(index)
          .get('relation') as FormArray;
        control.push(this.createRelation(element.trait, element.value));
      });
    }
  }

  // Rimuove una relazione specifica da un componente dato il suo indice ix e l'indice della relazione iy
  async removeRelation(ix, iy) {
    // Ottiene il controllo della forma specifica per le relazioni del componente all'indice ix
    const control = (<FormArray>this.decompForm.controls['component'])
      .at(ix)
      .get('relation') as FormArray;
    // Estrae il tratto e il valore dalla relazione all'indice iy
    const trait = control.at(iy).get('trait').value;
    const value = control.at(iy).get('value').value;
    // Verifica che il tratto e il valore non siano vuoti
    if (trait != '' && value != '') {
      // Ottiene l'ID del componente dalla memoria
      let compId = this.memoryComponent[ix].componentInstanceName;
      // Prepara i parametri per la richiesta di cancellazione
      let parameters = {
        type: 'morphology',
        relation: trait,
        value: value,
      };
      try {
        // Effettua la richiesta per cancellare la relazione linguistica
        let delete_linguistic_rel_req =
          await this.lexicalService.deleteLinguisticRelation(
            compId,
            parameters
          );
        // Aggiorna l'interfaccia utente dopo l'eliminazione
        this.lexicalService.refreshAfterEdit({
          request: 0,
          label: this.object.label,
        });
        this.lexicalService.spinnerAction('off');
        this.lexicalService.refreshFilter({ request: true });
      } catch (error) {
        // Gestisce l'errore, se lo stato è 200 aggiorna comunque l'interfaccia utente
        if (error.status == 200) {
          this.lexicalService.refreshAfterEdit({
            request: 0,
            label: this.object.label,
          });
          this.lexicalService.spinnerAction('off');
          this.lexicalService.refreshFilter({ request: true });
          // Mostra un messaggio di successo
          this.toastr.success('Element removed correctly for ' + compId, '', {
            timeOut: 5000,
          });
        } else {
          // Mostra un messaggio di errore
          this.toastr.error(error.error, 'Error', {
            timeOut: 5000,
          });
        }
      }
    } else {
      // Se il tratto o il valore sono vuoti, permette l'aggiunta di nuovi tratti
      this.disableAddTraits[ix] = false;
    }
    // Aggiorna le strutture dati locali dopo la rimozione
    this.memoryComponent[ix].morphology.splice(iy, 1);
    this.valueTraits[ix].splice(iy, 1);
    this.memoryValues[ix].splice(iy, 1);
    control.removeAt(iy);
  }

  // Attiva un evento quando un subtermine viene selezionato o modificato
  triggerSubterm(evt) {
    // Registra il valore dell'evento se l'obiettivo è definito
    if (evt.target != undefined) {
      this.subterm_subject.next(evt.target.value);
    }
  }

  // Attiva un evento quando viene selezionata la corrispondenza
  triggerCorrespondsTo(evt) {
    // Registra il valore dell'evento se l'obiettivo è definito
    if (evt.target != undefined) {
      this.corresponds_subject.next(evt.target.value);
    }
  }

  // Rimuove un subtermine dato il suo indice
  async removeSubterm(index) {
    // Verifica che l'istanza del termine lessicale non sia indefinita
    if (this.object.lexicalEntryInstanceName != undefined) {
      // Ottiene il controllo del formArray per i subtermini
      this.subtermArray = this.decompForm.get('subterm') as FormArray;
      // Estrae l'entità del subtermine dall'indice dato
      let entity = this.subtermArray.at(index).get('entity').value;
      let lexId = this.object.lexicalEntryInstanceName;
      // Prepara i parametri per la cancellazione
      let parameters = {
        relation: 'subterm',
        value: entity,
      };
      try {
        // Effettua la richiesta di cancellazione della relazione linguistica
        let delete_linguistic_rel_req = await this.lexicalService
          .deleteLinguisticRelation(lexId, parameters)
          .toPromise();
        // Informa l'utente dell'avvenuta rimozione
        this.toastr.info('Subterm removed correctly', 'Info', {
          timeOut: 5000,
        });
        // Effettua ulteriori operazioni dopo la cancellazione
        this.lexicalService.deleteRequest({
          subtermInstanceName: entity,
          parentNode: this.object.lexicaleEntryInstanceName,
        });
      } catch (error) {
        // Gestisce gli errori della richiesta
        if (error.status == 200) {
          // Se lo stato è 200, informa comunque l'utente della corretta rimozione
          this.toastr.info('Subterm removed correctly', 'Info', {
            timeOut: 5000,
          });
          this.lexicalService.deleteRequest({
            subtermInstanceName: entity,
            parentNode: this.object.lexicaleEntryInstanceName,
          });
        } else {
          // In caso di errore, informa l'utente
          this.toastr.error(
            'Something went wrong, please check the log',
            'Error',
            { timeOut: 5000 }
          );
        }
      }
    }
    // Aggiorna la struttura dati locale e l'interfaccia utente dopo la rimozione
    this.subtermArray.removeAt(index);
    this.memorySubterm.splice(index, 1);
    // Rende nuovamente possibile l'aggiunta di subtermini
    this.subtermDisabled = false;
  }

  // Crea una nuova relazione con i tratti e i valori forniti, o vuota se non specificati
  createRelation(t?, v?) {
    // Se t non è definito, ritorna un gruppo di form con valori vuoti
    if (t == undefined) {
      return this.formBuilder.group({
        trait: '',
        value: '',
      });
    } else {
      // Altrimenti, ritorna un gruppo di form con i valori forniti
      return this.formBuilder.group({
        trait: t,
        value: v,
      });
    }
  }

  // Rimuove una corrispondenza da un componente specifico dato l'indice ix del componente e l'indice iy della corrispondenza.
  removeCorrespondsToComponent(ix, iy) {
    const control = (<FormArray>this.decompForm.controls['component'])
      .at(ix)
      .get('corresponds_to') as FormArray;
    control.removeAt(iy);
  }

  // Crea un componente del formulario. Se non vengono passati parametri, crea un gruppo di controlli con valori predefiniti. Altrimenti, utilizza i valori forniti.
  createComponent(
    compId?,
    componentURI?,
    confidence?,
    creator?,
    label?,
    creationDate?,
    lastUpdate?,
    morphology?,
    note?,
    position?,
    corr_to?
  ) {
    if (compId == undefined) {
      return this.formBuilder.group({
        id: new FormControl(''),
        uri: new FormControl(''),
        confidence: new FormControl(null),
        creator: new FormControl(''),
        label: new FormControl(''),
        creationDate: new FormControl(''),
        lastUpdate: new FormControl(''),
        relation: new FormArray([]),
        note: new FormControl(''),
        corresponds_to: new FormControl(''),
        position: new FormControl(''),
      });
    } else {
      return this.formBuilder.group({
        id: new FormControl(compId),
        uri: new FormControl(componentURI),
        confidence: new FormControl(confidence),
        creator: new FormControl(creator),
        label: new FormControl(label),
        creationDate: new FormControl(creationDate),
        lastUpdate: new FormControl(lastUpdate),
        relation: new FormArray([]),
        note: new FormControl(note),
        corresponds_to: new FormControl(corr_to),
        position: new FormControl(position),
      });
    }
  }

  // Crea un componente subterm del formulario. Se i parametri sono definiti, usa quei valori, altrimenti crea un gruppo di controlli con valori vuoti.
  createSubtermComponent(e?, l?, lang?) {
    if (e != undefined) {
      return this.formBuilder.group({
        entity: e,
        label: l,
        language: lang,
      });
    } else {
      return this.formBuilder.group({
        entity: '',
        label: '',
        language: '',
      });
    }
  }

  // Gestisce la selezione di un subterm, sia tramite selezione da una lista che tramite inserimento manuale.
  handleSubterm(evt, i) {
    if (evt instanceof NgSelectComponent) {
      if (evt.selectedItems.length > 0) {
        console.log(evt.selectedItems[0]);
        let label = evt.selectedItems[0]['value']['lexicalEntryInstanceName'];
        this.onChangeSubterm({
          name: label,
          i: i,
          object: evt.selectedItems[0]['value'],
        });
      }
    } else {
      let label = evt.target.value;
      this.ext_subterm_subject.next({ name: label, i: i });
    }
  }

  // Gestisce la selezione della corrispondenza per un componente, tramite selezione da una lista.
  handleCorrespondsTo(evt, i) {
    if (evt instanceof NgSelectComponent) {
      if (evt.selectedItems.length > 0) {
        console.log(evt.selectedItems[0]);
        let label = evt.selectedItems[0]['value']['lexicalEntryInstanceName'];
        this.onChangeCorrespondsTo({ name: label, i: i });
      }
    }
  }

  // Funzione per gestire l'input dell'utente con debounce, riducendo le richieste per i campi in tempo reale.
  debounceKeyup(evt, index, field) {
    this.update_component_subject.next({ v: evt, i: index, f: field });
  }

  /**
   * Funzione asincrona che gestisce l'evento di cambio del subterm.
   *
   * @param data Dati relativi all'evento di cambio del subterm
   */
  async onChangeSubterm(data) {
    // Ottieni l'indice del subterm
    var index = data['i'];
    // Ottieni l'array dei subterm dal form
    this.subtermArray = this.decompForm.get('subterm') as FormArray;

    // Se il subterm nella memoria all'indice specificato è indefinito
    if (this.memorySubterm[index] == undefined) {
      // Ottieni il nuovo valore del subterm
      const newValue = data['name'];
      // Crea un oggetto con i parametri per la richiesta di aggiornamento
      const parameters = {
        type: 'decomp',
        relation: 'subterm',
        value: newValue,
      };
      // Stampa i parametri a console per debug
      console.log(parameters);

      // Imposta il tipo di richiesta nell'oggetto
      this.object['request'] = 'subterm';
      let lexId = this.object.lexicalEntryInstanceName;

      try {
        // Invia la richiesta di aggiornamento al servizio e attendi la risposta
        let change_subterm_req = await this.lexicalService
          .updateLinguisticRelation(lexId, parameters)
          .toPromise();
        // Stampa la risposta a console per debug
        console.log(change_subterm_req);
        // Disattiva lo spinner
        this.lexicalService.spinnerAction('off');
        // Aggiorna il subterm nell'array di memoria
        this.memorySubterm[index] = change_subterm_req;
        // Aggiorna i valori del subterm nel form
        this.subtermArray
          .at(index)
          .patchValue({
            entity: change_subterm_req.object.label,
            label: change_subterm_req['label'],
            language: change_subterm_req['language'],
          });
        // Abilita la modifica del subterm
        this.subtermDisabled = false;
        // Aggiungi una richiesta di aggiunta di un subelemento
        this.lexicalService.addSubElementRequest({
          lex: this.object,
          data: change_subterm_req,
        });
      } catch (error) {
        // Se si verifica un errore durante la richiesta
        this.lexicalService.spinnerAction('off');
        if (error.status == 200) {
          // Se lo status è 200, mostra un messaggio di successo
          this.toastr.success('Subterm changed correctly for ' + lexId, '', {
            timeOut: 5000,
          });
          // Abilita la modifica del subterm
          this.subtermDisabled = false;
          // Aggiorna il subterm nell'array di memoria
          this.memorySubterm[index] = this.object;
          // Imposta la richiesta come 'subterm' nei dati
          data['request'] = 'subterm';
          // Aggiorna i valori del subterm nel form
          this.subtermArray
            .at(index)
            .patchValue({
              entity: newValue,
              label: data.object.label,
              language: data.object.language,
            });
          // Aggiungi una richiesta di aggiunta di un subelemento
          this.lexicalService.addSubElementRequest({
            lex: this.object,
            data: data['object'],
          });
        } else {
          // Se c'è un errore diverso dallo status 200, mostra un messaggio di errore
          this.toastr.error(error.error, 'Error', {
            timeOut: 5000,
          });
        }
      }
    } else {
      // Se il subterm nella memoria all'indice specificato è definito
      const oldValue = this.memorySubterm[index]['lexicalEntryInstanceName'];
      const newValue = data['name'];
      const parameters = {
        type: 'decomp',
        relation: 'subterm',
        value: newValue,
        currentValue: oldValue,
      };

      let lexId = this.object.lexicalEntryInstanceName;
      console.log(parameters);

      try {
        let change_subterm_req = await this.lexicalService
          .updateLinguisticRelation(lexId, parameters)
          .toPromise();
        console.log(change_subterm_req);
        this.lexicalService.spinnerAction('off');
        change_subterm_req['request'] = 0;
        this.lexicalService.refreshAfterEdit(change_subterm_req);
      } catch (error) {
        console.log(error);
        const data = this.object;
        data['request'] = 0;

        this.lexicalService.spinnerAction('off');
        if (error.status == 200) {
          this.toastr.success('Label changed correctly for ' + lexId, '', {
            timeOut: 5000,
          });
        } else {
          this.toastr.error(error.error, 'Error', {
            timeOut: 5000,
          });
        }
      }
      this.memorySubterm[index] = data;
    }
  }

  /**
   * Funzione asincrona che gestisce l'evento di cambio di 'correspondsTo'.
   *
   * @param data Dati relativi all'evento di cambio di 'correspondsTo'
   */
  async onChangeCorrespondsTo(data) {
    // Ottieni l'indice di 'data'
    var index = data['i'];
    // Ottieni l'array dei subterm dal form
    this.subtermArray = this.decompForm.get('subterm') as FormArray;

    // Se 'corresponds_to' nell'elemento di memoria all'indice specificato è indefinito
    if (this.memoryComponent[index].corresponds_to == undefined) {
      // Ottieni il nuovo valore di 'correspondsTo'
      const newValue = data['name'];
      // Crea un oggetto con i parametri per la richiesta di aggiornamento
      const parameters = {
        type: 'decomp',
        relation: 'correspondsTo',
        value: newValue,
      };
      // Stampa i parametri a console per debug
      console.log(parameters);
      let compId = this.memoryComponent[index].componentInstanceName;

      try {
        // Invia la richiesta di aggiornamento al servizio e attendi la risposta
        let change_corr_req = this.lexicalService
          .updateLinguisticRelation(compId, parameters)
          .toPromise();
        // Stampa la risposta a console per debug
        console.log(change_corr_req);
        // Disattiva lo spinner
        this.lexicalService.spinnerAction('off');
      } catch (error) {
        // Se si verifica un errore durante la richiesta
        this.lexicalService.spinnerAction('off');
        if (error.status == 200) {
          // Se lo status è 200, mostra un messaggio di successo
          this.toastr.success(
            'CorrespondsTo changed correctly for ' + compId,
            '',
            {
              timeOut: 5000,
            }
          );
        } else {
          // Se c'è un errore diverso dallo status 200, mostra un messaggio di errore
          this.toastr.error(error.error, 'Error', {
            timeOut: 5000,
          });
        }
      }
      // Aggiorna 'corresponds_to' nell'elemento di memoria
      this.memoryComponent[index].corresponds_to = data;
    } else {
      // Se 'corresponds_to' nell'elemento di memoria all'indice specificato è definito
      const oldValue = this.memoryComponent[index].corresponds_to;
      const newValue = data['name'];
      const parameters = {
        type: 'decomp',
        relation: 'correspondsTo',
        value: newValue,
        currentValue: oldValue,
      };

      let compId = this.memoryComponent[index].componentInstanceName;
      console.log(parameters);
      try {
        // Invia la richiesta di aggiornamento al servizio e attendi la risposta
        let change_corr_req = this.lexicalService
          .updateLinguisticRelation(compId, parameters)
          .toPromise();
        // Stampa la risposta a console per debug
        console.log(change_corr_req);
        // Disattiva lo spinner
        this.lexicalService.spinnerAction('off');
      } catch (error) {
        // Se si verifica un errore durante la richiesta
        this.lexicalService.spinnerAction('off');
        if (error.status == 200) {
          // Se lo status è 200, mostra un messaggio di successo
          this.toastr.success(
            'CorrespondsTo changed correctly for ' + compId,
            '',
            {
              timeOut: 5000,
            }
          );
        } else {
          // Se c'è un errore diverso dallo status 200, mostra un messaggio di errore
          this.toastr.error(error.error, 'Error', {
            timeOut: 5000,
          });
        }
      }
      // Aggiorna 'corresponds_to' nell'elemento di memoria
      this.memoryComponent[index].corresponds_to = data;
    }
  }

  /**
   * Funzione asincrona che gestisce l'evento di ricerca e filtro.
   *
   * @param data Dati relativi all'evento di ricerca e filtro
   */
  async onSearchFilter(data) {
    // Resetta l'array dei risultati della ricerca
    this.searchResults = [];

    // Se il nome dell'istanza lessicale è definito
    if (this.object.lexicalEntryInstanceName != undefined) {
      // Crea un oggetto con i parametri di ricerca
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

      try {
        // Esegue la richiesta di ricerca delle voci lessicali e attendi la risposta
        let search_filter_req = await this.lexicalService
          .getLexicalEntriesList(parameters)
          .toPromise();
        // Stampa i dati della ricerca a console per debug
        console.log(data);
        // Aggiorna l'array dei risultati della ricerca con i dati ricevuti
        this.searchResults = data['list'];
      } catch (error) {
        // Se si verifica un errore durante la richiesta, stampa l'errore a console per debug
        console.log(error);
      }
    } else {
    }
  }

  /**
   * Funzione che elimina i dati della ricerca.
   */
  deleteData() {
    // Resetta l'array dei risultati della ricerca
    this.searchResults = [];
  }

  /**
   * Funzione chiamata quando il componente viene distrutto.
   */
  ngOnDestroy(): void {
    // Annulla la sottoscrizione agli eventi
    this.change_decomp_label_subscription.unsubscribe();
    this.subterm_subject_subscription.unsubscribe();
    this.ext_subterm_subject_subscription.unsubscribe();
    this.corresponds_subject_subscription.unsubscribe();
    this.update_component_subject_subscription.unsubscribe();

    // Completa e invia il segnale di distruzione al subject
    this.destroy$.next(true);
    this.destroy$.complete();
  }
}
