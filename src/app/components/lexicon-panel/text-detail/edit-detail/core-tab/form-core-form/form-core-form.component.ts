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
  Form,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { forkJoin, Observable, Subject, Subscription } from 'rxjs';
import {
  debounceTime,
  pairwise,
  startWith,
  take,
  takeUntil,
} from 'rxjs/operators';
import { LexicalEntriesService } from 'src/app/services/lexical-entries/lexical-entries.service';
import { ToastrService } from 'ngx-toastr';
import { DocumentSystemService } from 'src/app/services/document-system/document-system.service';
import { AnnotatorService } from 'src/app/services/annotator/annotator.service';

@Component({
  selector: 'app-form-core-form',
  templateUrl: './form-core-form.component.html',
  styleUrls: ['./form-core-form.component.scss'],
})
export class FormCoreFormComponent implements OnInit, OnDestroy {
  @Input() formData: any;

  private subject_label: Subject<any> = new Subject();
  private subject_ex_label: Subject<any> = new Subject();

  switchInput = false;
  subscription: Subscription;
  object: any;
  peopleLoading = false;
  counter = 0;
  typesData = [];
  morphologyData = [];
  valueTraits = [];
  memoryTraits = [];
  interval;

  formCore = new FormGroup({
    inheritance: new FormArray([this.createInheritance()]),
    type: new FormControl(''),
    confidence: new FormControl(null),
    label: new FormArray([this.createLabel()]),
    morphoTraits: new FormArray([this.createMorphoTraits()]),
  });

  labelData = [];
  memoryLabel = [];

  ontolexRepresentations = [];
  lexinfoRepresentations = [];
  typeDesc = '';

  staticOtherDef = [];
  staticMorpho = [];

  morphoTraits: FormArray;
  inheritanceArray: FormArray;
  labelArray: FormArray;

  disableAddOther = false;
  disableAddMorpho = false;

  get_morpho_data_subscription: Subscription;
  subject_label_subscription: Subscription;
  subject_ex_label_subscription: Subscription;
  get_form_type_subscription: Subscription;

  destroy$: Subject<boolean> = new Subject();

  constructor(
    private lexicalService: LexicalEntriesService,
    private formBuilder: FormBuilder,
    private toastr: ToastrService,
    private documentService: DocumentSystemService,
    private annotatorService: AnnotatorService
  ) {}

  ngOnInit() {
    // Abilita i pulsanti per aggiungere morfologia e altre informazioni
    this.disableAddMorpho = false;
    this.disableAddOther = false;

    // Sottoscrizione ai dati di morfologia
    this.get_morpho_data_subscription = this.lexicalService
      .getMorphologyData()
      .subscribe((data) => {
        this.morphologyData = data;
        // Filtra i dati di morfologia escludendo il tipo di discorso
        this.morphologyData = this.morphologyData.filter((x) => {
          if (x.propertyId != 'partOfSpeech') {
            return true;
          } else {
            return false;
          }
        });
      });

    // Inizializza il form del core
    this.formCore = this.formBuilder.group({
      inheritance: this.formBuilder.array([]),
      type: '',
      confidence: null,
      label: this.formBuilder.array([]),
      morphoTraits: this.formBuilder.array([]),
    });

    // Gestisce i cambiamenti nel form
    this.onChanges();

    // Sottoscrizione al label soggetto
    this.subject_label_subscription = this.subject_label
      .pipe(debounceTime(3000), takeUntil(this.destroy$))
      .subscribe((data) => {
        this.onChangeLabel(data);
      });

    // Sottoscrizione al label esistente
    this.subject_ex_label_subscription = this.subject_ex_label
      .pipe(debounceTime(3000), takeUntil(this.destroy$))
      .subscribe((data) => {
        this.onChangeExistingLabelValue(data['evt'], data['i']);
      });

    // Ottiene i tipi di form
    this.get_form_type_subscription = this.lexicalService
      .getFormTypes()
      .subscribe(
        (data) => {
          this.typesData = data;
        },
        (error) => {
          console.log(error);
        }
      );
  }

  ngOnChanges(changes: SimpleChanges) {
    setTimeout(() => {
      if (this.object != changes.formData.currentValue) {
        // Pulisce i form quando i dati cambiano
        this.morphoTraits = this.formCore.get('morphoTraits') as FormArray;
        this.morphoTraits.clear();

        this.inheritanceArray = this.formCore.get('inheritance') as FormArray;
        this.inheritanceArray.clear();

        this.labelArray = this.formCore.get('label') as FormArray;
        this.labelArray.clear();

        this.staticMorpho = [];
        this.staticOtherDef = [];
      }
      this.object = changes.formData.currentValue;
      if (this.object != null) {
        // Inizializza le variabili
        this.valueTraits = [];
        this.memoryTraits = [];
        this.memoryLabel = [];
        this.labelData = [];

        // Aggiunge eredità se presente
        if (this.object.inheritedMorphology != undefined) {
          for (var i = 0; i < this.object.inheritedMorphology.length; i++) {
            const trait = this.object.inheritedMorphology[i]['trait'];
            const value = this.object.inheritedMorphology[i]['value'];
            this.addInheritance(trait, value.split('#')[1]);
          }
        }

        // Imposta la fiducia e il tipo
        if (this.object.confidence == 0) {
          this.formCore.get('confidence').setValue(true, { emitEvent: false });
        } else {
          this.formCore.get('confidence').setValue(false, { emitEvent: false });
        }
        this.formCore
          .get('type')
          .setValue(this.object.type, { emitEvent: false });

        // Aggiunge etichette
        for (var i = 0; i < this.object.label.length; i++) {
          const trait = this.object.label[i]['propertyID'];
          const value = this.object.label[i]['propertyValue'];

          this.labelData.push(trait);

          if (value != '') {
            this.addLabel(trait, value);
            this.memoryLabel.push(trait);
            this.staticOtherDef.push({ trait: trait, value: value });
          }
        }

        // Ottiene dati di morfologia
        setTimeout(async () => {
          this.morphologyData = await this.lexicalService
            .getMorphologyData()
            .toPromise();
          for (var i = 0; i < this.object.morphology.length; i++) {
            const trait = this.object.morphology[i]['trait'];
            const value = this.object.morphology[i]['value'];

            let traitDescription = '';
            this.morphologyData.filter((x) => {
              if (
                x.propertyId == trait &&
                trait !=
                  'http://www.lexinfo.net/ontology/3.0/lexinfo#partOfSpeech'
              ) {
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
            this.addMorphoTraits(trait, value, traitDescription);
            this.onChangeTrait(trait, i);

            this.staticMorpho.push({ trait: trait, value: value });
          }
        }, 1);

        // Ottiene rappresentazioni Ontolex e Lexinfo
        setTimeout(async () => {
          this.ontolexRepresentations = await this.lexicalService
            .getOntolexRepresentations()
            .toPromise();
          this.lexinfoRepresentations = await this.lexicalService
            .getLexinfoRepresentations()
            .toPromise();
          this.typesData = await this.lexicalService.getFormTypes().toPromise();
          let type = this.formCore.get('type').value;
          this.typesData.forEach((el) => {
            if (el.valueId.split('#')[1] == type) {
              this.typeDesc = el.valueDescription;
            }
          });
        }, 1);

        // Cerca attestazioni
        let formId = this.object.form;
        this.documentService
          .searchAttestations(formId)
          .pipe(takeUntil(this.destroy$))
          .subscribe(
            (data) => {
              console.log(data);
              if (data != undefined) {
                let rows = data.rows;
                if (data.rows.length > 0) {
                  let ids = new Set();
                  let tokensId = new Set();
                  rows.forEach((element) => {
                    let path = element.nodePath.split('/');
                    let tokenId = null;
                    element.tokens.forEach((token) => {
                      if (token.id != undefined) {
                        tokenId = token.id;
                        return;
                      }
                    });
                    path = path[path.length - 1];
                    ids.add(
                      JSON.stringify({ nodeId: element.nodeId, nodePath: path })
                    );
                    tokensId.add(
                      JSON.stringify({ tokenId: tokenId, nodePath: path })
                    );
                  });

                  console.log(ids, tokensId);
                  if (ids.size > 0) {
                    this.getAnnotations(ids, tokensId);
                  }
                } else {
                  this.lexicalService.triggerAttestationPanel(false);
                  this.lexicalService.sendToAttestationPanel(null);
                }
              }
            },
            (error) => {
              console.log(error);
            }
          );
      }
    }, 1);
  }

  /**
   * Ottiene le annotazioni per gli id forniti e gestisce la visualizzazione dei risultati.
   * @param setIds Array di stringhe contenenti gli id degli elementi
   * @param tokensId Id dei token
   */
  getAnnotations(setIds, tokensId) {
    console.log(setIds);
    let annotation_array = [];

    const requests: Observable<any>[] = [];
    setIds.forEach((element) => {
      let elem = JSON.parse(element);
      requests.push(this.annotatorService.getAnnotation(elem.nodeId));
    });

    forkJoin(requests)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (data: any) => {
          console.log(data);

          if (data != undefined) {
            let filter_anno = [];

            data.forEach((element) => {
              if (element.annotations != undefined) {
                let annotations = element.annotations;

                annotations.forEach((anno) => {
                  if (anno.layer == 'attestation') {
                    if (anno.value == this.object.form) {
                      if (anno.attributes.bibliography == undefined)
                        anno.attributes['bibliography'] = [];
                      setIds.forEach((elem) => {
                        let el = JSON.parse(elem);
                        if (el.nodeId == anno.node)
                          anno.attributes['fileId'] = el.nodePath;
                        //console.log(el, anno)
                      });
                      filter_anno.push(anno);
                    }
                  }
                });
              }
            });

            console.log(filter_anno);
            this.annotatorService.getIdText(null);
            this.lexicalService.triggerAttestationPanel(true);
            this.lexicalService.sendToAttestationPanel(filter_anno);
          }
        },
        (error) => {
          console.log(error);
        }
      );
  }

  /**
   * Gestisce il cambiamento di valore del campo "confidence" del form e lo aggiorna nel servizio.
   */
  onChanges(): void {
    this.formCore
      .get('confidence')
      .valueChanges.pipe(
        debounceTime(100),
        startWith(this.formCore.get('confidence').value),
        pairwise(),
        takeUntil(this.destroy$)
      )
      .subscribe(([prev, next]: [any, any]) => {
        let confidence_value = null;
        console.log(confidence_value);
        let formId = this.object.form;

        this.formCore.get('confidence').setValue(next, { emitEvent: false });

        let oldValue = prev ? 0 : 1;
        let newValue = next ? 0 : 1;
        let parameters = {
          /* type: "confidence", */
          relation: 'http://www.lexinfo.net/ontology/3.0/lexinfo#confidence',
          value: newValue,
        };

        if (prev !== null) parameters['currentValue'] = oldValue;

        this.lexicalService
          .updateForm(formId, parameters)
          .pipe(takeUntil(this.destroy$))
          .subscribe(
            (data) => {},
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
  }

  /**
   * Gestisce il cambiamento del tipo nel form e aggiorna il servizio di backend con il nuovo tipo.
   * @param evt Evento scatenato dal cambio di tipo
   */
  onChangeType(evt) {
    this.lexicalService.spinnerAction('on');
    const newType = evt.target.value;
    const formId = this.object.form;
    const parameters = {
      relation: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
      value: newType,
    };
    this.lexicalService
      .updateForm(formId, parameters)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (data) => {
          console.log(data);
          this.lexicalService.spinnerAction('off');
          data['request'] = 5;
          data['new_type'] = newType;
          this.lexicalService.refreshAfterEdit(data);
          this.lexicalService.updateCoreCard(this.object);

          setTimeout(() => {
            let type = this.formCore.get('type').value;
            this.typesData.forEach((el) => {
              if (el.valueId == type) {
                this.typeDesc = el.valueDescription;
              }
            });
            //@ts-ignore
            $('.type-tooltip').tooltip({
              trigger: 'hover',
            });
          }, 1000);
        },
        (error) => {
          console.log(error);
          const data = this.object;
          data['request'] = 5;
          data['new_type'] = newType;
          this.lexicalService.refreshAfterEdit(data);
          this.lexicalService.updateCoreCard({ lastUpdate: error.error.text });
          this.lexicalService.spinnerAction('off');

          if (typeof error.error != 'object') {
            this.toastr.error(error.error, 'Error', {
              timeOut: 5000,
            });
          } else {
            this.toastr.success('Type changed', '', {
              timeOut: 5000,
            });
          }

          setTimeout(() => {
            let type = this.formCore.get('type').value;
            this.typesData.forEach((el) => {
              if (el.valueId == type) {
                this.typeDesc = el.valueDescription;
              }
            });
            //@ts-ignore
            $('.type-tooltip').tooltip({
              trigger: 'hover',
            });
          }, 1000);
        }
      );
  }

  /**
   * Gestisce il debounce dell'evento keyup per le etichette soggetto.
   * @param evt L'evento keyup.
   * @param i L'indice relativo all'elemento.
   */
  debounceKeyup(evt, i) {
    this.lexicalService.spinnerAction('on');
    this.subject_label.next({ evt, i });
  }

  /**
   * Gestisce il debounce dell'evento keyup per le etichette soggetto esistenti.
   * @param evt L'evento keyup.
   * @param i L'indice relativo all'elemento.
   */
  debounceKeyupExisting(evt, i) {
    this.lexicalService.spinnerAction('on');
    this.subject_ex_label.next({ evt, i });
  }

  /**
   * Gestisce il cambiamento del valore esistente.
   * @param evt L'evento change.
   * @param i L'indice relativo all'elemento.
   */
  onChangeExistingValue(evt, i) {
    this.lexicalService.spinnerAction('on');
    this.morphoTraits = this.formCore.get('morphoTraits') as FormArray;
    const trait = this.morphoTraits.at(i).get('trait').value;
    const oldValue = this.morphoTraits.at(i).get('value').value;
    const newValue = evt.target.value;

    this.morphoTraits
      .at(i)
      .get('value')
      .setValue(newValue, { emitEvent: false });

    if (newValue != '') {
      let parameters = {
        type: 'morphology',
        relation: trait,
        value: newValue,
        currentValue: oldValue,
      };

      this.staticMorpho[i] = { trait: trait, value: newValue };
      let formId = this.object.form;
      console.log(parameters);

      this.lexicalService
        .updateLinguisticRelation(formId, parameters)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            console.log(data);
            //this.lexicalService.refreshAfterEdit(data);
            this.lexicalService.updateCoreCard(data);
            this.lexicalService.spinnerAction('off');
          },
          (error) => {
            console.log(error);
            //this.lexicalService.refreshAfterEdit({ label: this.object.label });
            this.lexicalService.updateCoreCard({
              lastUpdate: error.error.text,
            });
            this.lexicalService.spinnerAction('off');
            if (error.status != 200) {
              this.toastr.error(error.error, 'Error', {
                timeOut: 5000,
              });
            } else {
              this.toastr.success('Morphologic trait changed', '', {
                timeOut: 5000,
              });
            }
          }
        );
    } else {
      this.lexicalService.spinnerAction('off');
    }
  }

  /**
   * Gestisce il cambiamento del valore.
   * @param i L'indice relativo all'elemento.
   */
  onChangeValue(i) {
    this.lexicalService.spinnerAction('on');
    this.morphoTraits = this.formCore.get('morphoTraits') as FormArray;
    const trait = this.morphoTraits.at(i).get('trait').value;
    const value = this.morphoTraits.at(i).get('value').value;
    if (trait != '' && value != '') {
      let parameters = {
        type: 'morphology',
        relation: trait,
        value: value,
      };
      let formId = this.object.form;

      let traitDescription = '';
      this.morphologyData.filter((x) => {
        if (x.propertyId == trait && trait != 'partOfSpeech') {
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
      console.log(parameters);
      this.morphoTraits
        .at(i)
        .get('description')
        .setValue(traitDescription, { emitEvent: false });

      this.staticMorpho.push({ trait: trait, value: value });

      this.lexicalService
        .updateLinguisticRelation(formId, parameters)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            console.log(data);
            this.lexicalService.spinnerAction('off');
            this.lexicalService.updateCoreCard(this.object);
            this.disableAddMorpho = false;
            setTimeout(() => {
              //@ts-ignore
              $('.trait-tooltip').tooltip({
                trigger: 'hover',
              });
            }, 1000);
          },
          (error) => {
            console.log(error);
            this.lexicalService.updateCoreCard({
              lastUpdate: error.error.text,
            });
            this.lexicalService.spinnerAction('off');
            this.disableAddMorpho = false;
            if (typeof error.error != 'object') {
              this.toastr.error(error.error, 'Error', {
                timeOut: 5000,
              });
            } else {
              this.toastr.success('Morphotrait changed correctly', 'Ok', {
                timeOut: 5000,
              });
            }

            setTimeout(() => {
              //@ts-ignore
              $('.trait-tooltip').tooltip({
                trigger: 'hover',
              });
            }, 1000);
          }
        );
    } else {
      this.lexicalService.spinnerAction('off');
    }
  }

  /**
   * Gestisce l'evento di cambio del tratto morfologico.
   *
   * @param evt Evento che ha scatenato la funzione.
   * @param i Indice dell'elemento interessato.
   */
  onChangeTrait(evt, i) {
    if (evt.target != undefined) {
      // Se l'evento ha un target definito...
      this.morphoTraits = this.formCore.get('morphoTraits') as FormArray;
      this.morphoTraits
        .at(i)
        .patchValue({ trait: evt.target.value, value: '' });

      if (evt.target.value != '') {
        // Se il valore dell'evento non è vuoto...
        var arrayValues = this.morphologyData.filter((x) => {
          return x['propertyId'] == evt.target.value;
        })['0']['propertyValues'];
        this.valueTraits[i] = arrayValues;
        this.memoryTraits[i] = evt.target.value;
      } else {
        // Se il valore dell'evento è vuoto...
        let arrayValues = [];
        this.valueTraits[i] = arrayValues;
        this.memoryTraits.splice(i, 1);
      }
    } else {
      // Se l'evento non ha un target definito...
      try {
        var arrayValues = this.morphologyData.filter((x) => {
          return x['propertyId'] == evt;
        })['0']['propertyValues'];
        this.valueTraits[i] = arrayValues;
        this.memoryTraits.push(evt);
      } catch (e) {
        console.log(e);
      }
    }
  }

  /**
   * Gestisce l'evento di cambio dell'etichetta del tratto morfologico.
   *
   * @param evt Evento che ha scatenato la funzione.
   * @param i Indice dell'elemento interessato.
   */
  onChangeLabelTrait(evt, i) {
    setTimeout(() => {
      this.labelArray = this.formCore.get('label') as FormArray;
      this.labelArray
        .at(i)
        .patchValue({ propertyID: evt.target.value, propertyValue: '' });

      if (evt.target.value != '') {
        // Se il valore dell'evento non è vuoto...
        this.memoryLabel[i] = evt.target.value;
      } else {
        // Se il valore dell'evento è vuoto...
        this.memoryLabel.splice(i, 1);
      }
    }, 250);
  }

  /**
   * Gestisce l'evento di cambio del valore dell'etichetta esistente.
   *
   * @param evt Evento che ha scatenato la funzione.
   * @param i Indice dell'elemento interessato.
   */
  onChangeExistingLabelValue(evt, i) {
    this.lexicalService.spinnerAction('on');
    this.labelArray = this.formCore.get('label') as FormArray;
    let trait = this.labelArray.at(i).get('propertyID').value;
    const newValue = evt.target.value;
    this.ontolexRepresentations.forEach((element) => {
      if (element.valueId.split('#')[1] == trait) {
        trait = element.valueId;
      }
    });

    this.lexinfoRepresentations.forEach((element) => {
      if (element.valueId.split('#')[1] == trait) {
        trait = element.valueId;
      }
    });

    if (newValue != '') {
      // Se il nuovo valore non è vuoto...
      const parameters = { relation: trait, value: newValue };
      this.staticOtherDef[i] = { trait: trait.split('#')[1], value: newValue };
      let formId = this.object.form;

      this.lexicalService
        .updateForm(formId, parameters)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            console.log(data);
            this.lexicalService.spinnerAction('off');
            this.lexicalService.updateCoreCard(data);
          },
          (error) => {
            console.log(error);
            this.lexicalService.updateCoreCard({
              lastUpdate: error.error.text,
            });
            this.lexicalService.spinnerAction('off');

            if (error.status != 200) {
              this.toastr.error(error.error, 'Error', {
                timeOut: 5000,
              });
            } else {
              this.lexicalService.changeFormLabel(formId, newValue);
              this.toastr.success('Label changed', '', {
                timeOut: 5000,
              });
            }
          }
        );

      if (trait.split('#')[1] == 'writtenRep') {
        const data = this.object;
        data['whatToSearch'] = 'form';
        data['new_label'] = newValue;
        data['request'] = 3;
        this.lexicalService.refreshAfterEdit(data);
      }
    } else {
      // Se il nuovo valore è vuoto...
      this.lexicalService.spinnerAction('off');
      this.staticOtherDef[i] = { trait: trait, value: '' };
    }
  }

  /**
   * Funzione chiamata quando viene modificata un'etichetta.
   * Aggiorna il valore dell'etichetta nel form e invia una richiesta di aggiornamento al servizio.
   * @param object Oggetto che contiene informazioni sull'evento di modifica.
   */
  onChangeLabel(object) {
    // Ottiene l'array delle etichette dal form
    this.labelArray = this.formCore.get('label') as FormArray;
    // Ottiene l'identificatore della proprietà corrispondente all'etichetta
    let trait = this.labelArray.at(object.i).get('propertyID').value;

    // Controlla se l'identificatore della proprietà è presente tra le rappresentazioni Ontolex
    this.ontolexRepresentations.forEach((element) => {
      if (element.valueId.split('#')[1] == trait) {
        trait = element.valueId;
      }
    });

    // Controlla se l'identificatore della proprietà è presente tra le rappresentazioni Lexinfo
    this.lexinfoRepresentations.forEach((element) => {
      if (element.valueId.split('#')[1] == trait) {
        trait = element.valueId;
      }
    });

    // Ottiene il nuovo valore dell'etichetta
    const newValue = object.evt.target.value;
    const formId = this.object.form;
    const parameters = { relation: trait, value: newValue };

    // Aggiunge la coppia trait-value all'array staticOtherDef per mostrare le modifiche in anteprima
    this.staticOtherDef.push({ trait: trait.split('#')[1], value: newValue });

    // Effettua l'aggiornamento solo se trait e newValue non sono undefined o vuoti
    if (trait != undefined && newValue != '') {
      // Invia la richiesta di aggiornamento al servizio
      this.lexicalService
        .updateForm(formId, parameters)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            // Gestisce la risposta positiva del servizio
            console.log(data);
            this.lexicalService.spinnerAction('off');
            this.lexicalService.refreshAfterEdit(data);
            this.lexicalService.updateCoreCard(data);
            this.disableAddOther = false;
          },
          (error) => {
            // Gestisce gli errori provenienti dal servizio
            console.log(error);
            this.disableAddOther = false;
            this.lexicalService.updateCoreCard({
              lastUpdate: error.error.text,
            });
            this.lexicalService.spinnerAction('off');

            if (error.status == 200) {
              this.toastr.success('Label updated', 'Success', {
                timeOut: 5000,
              });
            } else {
              this.toastr.error(error.message, 'Error', { timeOut: 5000 });
            }
          }
        );
    } else {
      // Disattiva lo spinner se trait o newValue sono undefined o vuoti
      this.lexicalService.spinnerAction('off');
    }
  }

  /**
   * Crea un FormGroup per rappresentare un trait morfologico.
   * @param t Valore del trait (opzionale).
   * @param v Valore (opzionale).
   * @param d Descrizione (opzionale).
   * @returns FormGroup per rappresentare un trait morfologico.
   */
  createMorphoTraits(t?, v?, d?): FormGroup {
    if (t != undefined) {
      return this.formBuilder.group({
        trait: new FormControl(t, [
          Validators.required,
          Validators.minLength(0),
        ]),
        value: new FormControl(v, [
          Validators.required,
          Validators.minLength(0),
        ]),
        description: new FormControl(d, [
          Validators.required,
          Validators.minLength(0),
        ]),
      });
    } else {
      return this.formBuilder.group({
        trait: new FormControl('', [
          Validators.required,
          Validators.minLength(0),
        ]),
        value: new FormControl('', [
          Validators.required,
          Validators.minLength(0),
        ]),
        description: new FormControl('', [
          Validators.required,
          Validators.minLength(0),
        ]),
      });
    }
  }

  /**
   * Crea un FormGroup per rappresentare un'eredità.
   * @param t Valore del trait (opzionale).
   * @param v Valore (opzionale).
   * @returns FormGroup per rappresentare un'eredità.
   */
  createInheritance(t?, v?): FormGroup {
    return this.formBuilder.group({
      trait: t,
      value: v,
    });
  }

  /**
   * Crea un FormGroup per rappresentare un'etichetta.
   * @param t Valore dell'ID della proprietà (opzionale).
   * @param v Valore della proprietà (opzionale).
   * @returns FormGroup per rappresentare un'etichetta.
   */
  createLabel(t?, v?): FormGroup {
    if (t != undefined) {
      return this.formBuilder.group({
        propertyID: new FormControl(t, [
          Validators.required,
          Validators.minLength(0),
        ]),
        propertyValue: new FormControl(v, [
          Validators.required,
          Validators.minLength(0),
        ]),
      });
    } else {
      return this.formBuilder.group({
        propertyID: new FormControl('', [
          Validators.required,
          Validators.minLength(0),
        ]),
        propertyValue: new FormControl('', [
          Validators.required,
          Validators.minLength(0),
        ]),
      });
    }
  }

  /**
   * Aggiunge un'etichetta all'array di etichette.
   * @param t Valore dell'ID della proprietà (opzionale).
   * @param v Valore della proprietà (opzionale).
   */
  addLabel(t?, v?) {
    this.labelArray = this.formCore.get('label') as FormArray;
    if (t != undefined) {
      this.labelArray.push(this.createLabel(t, v));
    } else {
      this.disableAddOther = true;
      this.labelArray.push(this.createLabel());
    }
  }

  /**
   * Aggiunge un'istanza di eredità all'array di eredità.
   * @param t Valore del trait (opzionale).
   * @param v Valore (opzionale).
   */
  addInheritance(t?, v?) {
    this.inheritanceArray = this.formCore.get('inheritance') as FormArray;
    this.inheritanceArray.push(this.createInheritance(t, v));
  }

  /**
   * Aggiunge un trait morfologico all'array di trait morfologici.
   * @param t Valore del trait (opzionale).
   * @param v Valore (opzionale).
   * @param d Descrizione (opzionale).
   */
  addMorphoTraits(t?, v?, d?) {
    this.morphoTraits = this.formCore.get('morphoTraits') as FormArray;
    if (t != undefined) {
      this.morphoTraits.push(this.createMorphoTraits(t, v, d));
    } else {
      this.morphoTraits.push(this.createMorphoTraits());
      this.disableAddMorpho = true;
    }
  }

  /**
   * Rimuove un elemento dalla lista dei tratti morfologici.
   * @param index Indice dell'elemento da rimuovere
   */
  removeElement(index) {
    // Ottiene il controllo dei tratti morfologici dal form
    this.morphoTraits = this.formCore.get('morphoTraits') as FormArray;

    // Ottiene il valore del tratto e il valore associato all'indice specificato
    const trait = this.morphoTraits.at(index).get('trait').value;
    const value = this.morphoTraits.at(index).get('value').value;

    // Verifica se il tratto non è vuoto
    if (trait != '') {
      // Ottiene l'ID del modulo
      let formId = this.object.form;

      // Costruisce i parametri per la richiesta di eliminazione
      let parameters = {
        type: 'morphology',
        relation: trait,
        value: value,
      };

      // Effettua la chiamata al servizio per eliminare la relazione linguistica
      this.lexicalService
        .deleteLinguisticRelation(formId, parameters)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            console.log(data);
            // Mostra un messaggio di successo
            this.toastr.success('Elemento rimosso', '', {
              timeOut: 5000,
            });
            // Aggiorna la scheda principale
            this.lexicalService.updateCoreCard(this.object);
          },
          (error) => {
            console.log(error);
            // Gestisce gli errori
            if (error.status != 200) {
              this.toastr.error(error.error, 'Errore', {
                timeOut: 5000,
              });
            }
          }
        );
    }
    // Riabilita la possibilità di aggiungere un tratto morfologico
    this.disableAddMorpho = false;
    // Rimuove gli elementi dai vari array
    this.staticMorpho.splice(index, 1);
    this.morphoTraits.removeAt(index);
    this.memoryTraits.splice(index, 1);
    this.valueTraits.splice(index, 1);
  }

  /**
   * Rimuove un'etichetta dalla lista delle etichette.
   * @param index Indice dell'etichetta da rimuovere
   */
  removeLabel(index) {
    // Ottiene il controllo delle etichette dal form
    this.labelArray = this.formCore.get('label') as FormArray;

    // Ottiene il valore dell'ID della proprietà e il valore associato all'indice specificato
    const trait = this.labelArray.at(index).get('propertyID').value;
    const value = this.labelArray.at(index).get('propertyValue').value;

    // Verifica se l'ID della proprietà non è vuoto
    if (trait != '') {
      // Ottiene l'ID del modulo
      let formId = this.object.form;

      // Costruisce i parametri per la richiesta di eliminazione
      let parameters = {
        type: 'morphology',
        relation: trait,
        value: value,
      };

      // Effettua la chiamata al servizio per eliminare la relazione linguistica
      this.lexicalService
        .deleteLinguisticRelation(formId, parameters)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            console.log(data);

            // Mostra un messaggio di successo
            this.toastr.success('Etichetta rimossa', 'Ok', { timeOut: 5000 });

            // Aggiorna la scheda principale
            this.lexicalService.updateCoreCard(this.object);
          },
          (error) => {
            console.log(error);
            // Gestisce gli errori
            if (error.status != 200) {
              this.toastr.error(error.message, 'Errore', { timeOut: 5000 });
            }
          }
        );
    } else {
      // Riabilita la possibilità di aggiungere un'altra etichetta
      this.disableAddOther = false;
    }
    // Rimuove l'etichetta dagli array
    this.staticOtherDef.splice(index, 1);
    this.labelArray.removeAt(index);
  }

  /**
   * Distrugge il componente, cancellando le sottoscrizioni agli Observable.
   */
  ngOnDestroy(): void {
    // Annulla le sottoscrizioni agli Observable
    this.get_morpho_data_subscription.unsubscribe();
    this.subject_label_subscription.unsubscribe();
    this.subject_ex_label_subscription.unsubscribe();
    this.get_form_type_subscription.unsubscribe();

    // Completa il Subject per evitare memory leaks
    this.destroy$.next(true);
    this.destroy$.complete();
  }
}
