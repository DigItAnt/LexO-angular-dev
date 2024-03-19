/*
  © Copyright 2021-2022  Istituto di Linguistica Computazionale "A. Zampolli", Consiglio Nazionale delle Ricerche, Pisa, Italy.
 
This file is part of EpiLexo.

EpiLexo is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

EpiLexo is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with EpiLexo. If not, see <https://www.gnu.org/licenses/>.
*/

import {
  ChangeDetectorRef,
  Component,
  ComponentFactoryResolver,
  Input,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { LexicalEntriesService } from '../../../../../../services/lexical-entries/lexical-entries.service';
import { Subject, Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import {
  FormBuilder,
  FormGroup,
  FormArray,
  FormControl,
  Validators,
  Form,
} from '@angular/forms';
import {
  debounceTime,
  distinctUntilChanged,
  pairwise,
  startWith,
  take,
  takeUntil,
} from 'rxjs/operators';
import { NgSelectComponent } from '@ng-select/ng-select';
import { LilaService } from 'src/app/services/lila/lila.service';
import { CognatePanelComponent } from './cognate-panel/cognate-panel.component';
import { ConceptService } from 'src/app/services/concept/concept.service';

@Component({
  selector: 'app-lexical-entry-core-form',
  templateUrl: './lexical-entry-core-form.component.html',
  styleUrls: ['./lexical-entry-core-form.component.scss'],
})
export class LexicalEntryCoreFormComponent implements OnInit, OnDestroy {
  @Input() lexData: any;
  @ViewChild('cognatePanel', { read: ViewContainerRef }) vc: ViewContainerRef;

  destroy$: Subject<boolean> = new Subject();
  private subject: Subject<any> = new Subject();
  switchInput = false;
  subscription: Subscription;
  object: any;
  peopleLoading = false;
  counter = 0;
  lexEntryTypesData = [];
  morphologyData = [];
  valueTraits = [];
  memoryTraits = [];
  memoryValues = [];
  languages = [];

  memoryDenotes = [];
  memoryCognates = [];
  memoryEvokes = [];
  memoryStem = '';

  valuePos = [];
  memoryPos = '';

  posDescription = '';
  typeDesc = '';
  staticMorpho = [];

  memoryConfidence = null;

  interval;

  searchResults = [];
  filterLoading = false;

  private denotes_subject: Subject<any> = new Subject();
  private cognates_subject: Subject<any> = new Subject();
  private evokes_subject: Subject<any> = new Subject();
  private subterm_subject: Subject<any> = new Subject();
  private ext_subterm_subject_subscription: Subscription;

  /* public urlRegex = /(^|\s)((https?:\/\/)?[\w-]+(\.[\w-]+)+\.?(:\d+)?(\/\S*)?)/gi */
  public urlRegex = /(^|\s)((https?:\/\/.+))/;

  emptyLabelFlag = false;
  emptyFlag = false;

  disableAddMorpho = false;
  disableAddSubterm = false;

  isMultiword = false;
  memorySubterm = [];

  coreForm = new FormGroup({
    label: new FormControl('', [Validators.required, Validators.minLength(2)]),
    type: new FormControl(''),
    confidence: new FormControl(null),
    language: new FormControl('', [
      Validators.required,
      Validators.minLength(0),
    ]),
    pos: new FormControl(''),
    morphoTraits: new FormArray([this.createMorphoTraits()]),
    stemType: new FormControl(''),
    evokes: new FormArray([this.createEvokes()]),
    denotes: new FormArray([this.createDenotes()]),
    cognates: new FormArray([this.createCognates()]),
    isCognate: new FormControl(null),
    isEtymon: new FormControl(null),
    subterm: new FormArray([]),
  });

  morphoTraits: FormArray;
  evokesArray: FormArray;
  denotesArray: FormArray;
  cognatesArray: FormArray;
  subtermArray: FormArray;
  disableAddCognates = false;
  disableAddDenotes = false;
  disableAddEvokes = false;
  arrayComponents = [];

  denotes_subject_subscription: Subscription;
  cognates_subject_subscription: Subscription;
  update_lang_subscription: Subscription;
  get_languages_subscription: Subscription;
  subject_subscription: Subscription;
  private ext_subterm_subject: Subject<any> = new Subject();
  subject_evokes_search: Subject<any> = new Subject();
  searchResultsConcepts: any;

  constructor(
    private lexicalService: LexicalEntriesService,
    private formBuilder: FormBuilder,
    private toastr: ToastrService,
    private lilaService: LilaService,
    private factory: ComponentFactoryResolver,
    private conceptService: ConceptService
  ) {}

  /**
   * Metodo chiamato quando viene inizializzato il componente.
   * Si occupa di sottoscriversi agli stream di dati relativi ai diversi campi di ricerca.
   * Inoltre, inizializza il form di input per le informazioni di base del lemma.
   */
  ngOnInit(): void {
    // Sottoscrizione all'observable per i dati sul campo "denotes"
    this.denotes_subject_subscription = this.denotes_subject
      .pipe(debounceTime(3000), takeUntil(this.destroy$))
      .subscribe((data) => {
        this.onChangeDenotes(data);
      });

    // Sottoscrizione all'observable per i dati sul campo "evokes"
    this.evokes_subject
      .pipe(debounceTime(3000), takeUntil(this.destroy$))
      .subscribe((data) => {
        this.onChangeEvokes(data);
      });

    // Sottoscrizione all'observable per i dati sul campo "ext_subterm"
    this.ext_subterm_subject_subscription = this.ext_subterm_subject
      .pipe(debounceTime(3000), takeUntil(this.destroy$))
      .subscribe((data) => {
        this.onChangeSubterm(data);
      });

    // Sottoscrizione all'observable per i dati sul campo "cognates"
    this.cognates_subject_subscription = this.cognates_subject
      .pipe(debounceTime(3000), takeUntil(this.destroy$))
      .subscribe((data) => {
        this.onChangeCognates(data);
      });

    // Sottoscrizione all'observable per i dati sul campo "subterm"
    this.subterm_subject
      .pipe(debounceTime(3000), takeUntil(this.destroy$))
      .subscribe((data) => {
        this.onSearchFilterSubterm(data);
      });

    // Sottoscrizione all'observable per l'aggiornamento della selezione della lingua
    this.update_lang_subscription =
      this.lexicalService.updateLangSelect$.subscribe((signal) => {
        if (signal != null) {
          // Se il segnale non è nullo, si aggiornano le lingue disponibili
          this.languages = [];
          this.lexicalService
            .getLexiconLanguages()
            .pipe(takeUntil(this.destroy$))
            .subscribe((data) => {
              for (var i = 0; i < data.length; i++) {
                this.languages[i] = data[i];
              }
            });
        }
      });

    // Sottoscrizione all'observable per ottenere le lingue disponibili
    this.get_languages_subscription = this.lexicalService
      .getLexiconLanguages()
      .subscribe((data) => {
        this.languages = [];
        for (var i = 0; i < data.length; i++) {
          this.languages[i] = data[i];
        }
      });

    // Sottoscrizione all'observable per la ricerca filtrata dei lemmi
    this.subject_subscription = this.subject
      .pipe(debounceTime(3000), takeUntil(this.destroy$))
      .subscribe((data) => {
        this.onSearchFilter(data);
      });

    // Sottoscrizione all'observable per la ricerca di concetti lessicali
    this.subject_evokes_search
      .pipe(debounceTime(3000), takeUntil(this.destroy$))
      .subscribe((data) => {
        this.onSearchLexicalConcept(data);
      });

    // Inizializzazione del form per le informazioni di base del lemma
    this.coreForm = this.formBuilder.group({
      label: '',
      type: '',
      confidence: false,
      language: '',
      pos: '',
      morphoTraits: this.formBuilder.array([]),
      stemType: '',
      evokes: this.formBuilder.array([this.createEvokes()]),
      denotes: this.formBuilder.array([this.createDenotes()]),
      cognates: this.formBuilder.array([this.createCognates()]),
      isCognate: false,
      isEtymon: false,
      subterm: this.formBuilder.array([]),
    });

    // Registra gli eventi di cambiamento nel form
    this.onChanges();
  }

  /**
   * Metodo chiamato per attivare l'evento di ricerca sui cognati.
   * @param evt L'evento scatenante.
   * @param i Indice relativo al campo di ricerca dei cognati.
   */
  triggerCognates(evt, i): void {
    console.log(evt);
    if (evt.target != undefined) {
      // Se l'evento non è indefinito, si attiva la ricerca sui cognati
      this.subject.next({ value: evt.target.value, index: i });
    }
  }

  /**
   * Metodo chiamato per attivare l'evento di ricerca sugli evocatori.
   * @param evt L'evento scatenante.
   * @param i Indice relativo al campo di ricerca degli evocatori.
   */
  triggerEvokes(evt, i): void {
    console.log(evt);
    if (evt.target != undefined) {
      // Se l'evento non è indefinito, si attiva la ricerca sugli evocatori
      this.subject_evokes_search.next({ value: evt.target.value, index: i });
    }
  }

  /**
   * Gestisce la ricerca e il filtraggio dei sottotermini.
   * @param data Il termine di ricerca.
   */
  onSearchFilterSubterm(data) {
    this.searchResults = [];

    if (this.object.lexicalEntry != undefined) {
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

      /* && data.length >= 3 */

      this.lexicalService
        .getLexicalEntriesList(parameters)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            console.log(data);
            let filter_lang = data.list.filter(
              (element) => element.lexicalEntry != this.object.lexicalEntry
            );

            console.log(filter_lang);
            this.searchResults = filter_lang;
          },
          (error) => {
            console.log(error);
          }
        );
    } else {
      // Se non c'è una voce lessicale definita, non fare nulla.
    }
  }

  /**
   * Gestisce la ricerca e il filtraggio generale.
   * @param data I dati della ricerca.
   */
  onSearchFilter(data) {
    this.filterLoading = true;
    this.searchResults = [];

    let value = data.value;
    let index = data.index;

    this.cognatesArray = this.coreForm.get('cognates') as FormArray;

    if (
      this.object.lexicalEntry != undefined &&
      !this.cognatesArray.at(index).get('lila').value
    ) {
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

      /* && data.length >= 3 */
      this.lexicalService
        .getLexicalEntriesList(parameters)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            console.log(data);

            if (data.list.length > 0) {
              let filter_lang = data.list.filter(
                (element) => element.language != this.object.language
              );
              filter_lang.forEach((element) => {
                element['label_lang'] = element.label + '@' + element.language;
              });
              console.log(filter_lang);
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
    } else if (
      this.object.lexicalEntry != undefined &&
      this.cognatesArray.at(index).get('lila').value
    ) {
      this.searchResults = [];
      this.lilaService
        .queryCognate(value)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            console.log(data);
            if (data.list.length > 0) {
              const map = data.list.map((element) => ({
                label: element[2].value,
                labelValue: element[0].value,
                pos: element[1].value,
              }));

              map.forEach((element) => {
                let tmpLblVal = element.labelValue.split('/');
                let labelValue = tmpLblVal[tmpLblVal.length - 1];

                let tmpLblPos = element.pos.split('/');
                let pos = tmpLblPos[tmpLblPos.length - 1];

                element.labelElement = labelValue;
                element.labelPos = pos;
              });

              this.searchResults = map;
              console.log(this.searchResults);
              this.filterLoading = false;
            }
          },
          (error) => {
            console.log(error);
            this.filterLoading = false;
          }
        );
    } else {
      this.filterLoading = false;
    }
  }

  /**
   * Gestisce la ricerca e il filtraggio dei concetti lessicali.
   * @param data I dati della ricerca.
   */
  onSearchLexicalConcept(data) {
    this.filterLoading = true;
    this.searchResults = [];

    let value = data.value;
    let index = data.index;

    this.evokesArray = this.coreForm.get('evokes') as FormArray;

    if (this.object.lexicalEntry != undefined) {
      let parameters = {
        text: value,
        searchMode: 'startsWith',
        labelType: 'prefLabel',
        author: '',
        offset: 0,
        limit: 500,
      };

      /* && data.length >= 3 */
      this.conceptService
        .conceptFilter(parameters)
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
              this.filterLoading = false;
            }
          },
          (error) => {
            //console.log(error)
            this.filterLoading = false;
          }
        );
    } else if (
      this.object.lexicalEntry != undefined &&
      this.cognatesArray.at(index).get('lila').value
    ) {
      this.searchResults = [];
      this.lilaService
        .queryCognate(value)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            console.log(data);
            if (data.list.length > 0) {
              const map = data.list.map((element) => ({
                label: element[2].value,
                labelValue: element[0].value,
                pos: element[1].value,
              }));

              map.forEach((element) => {
                let tmpLblVal = element.labelValue.split('/');
                let labelValue = tmpLblVal[tmpLblVal.length - 1];

                let tmpLblPos = element.pos.split('/');
                let pos = tmpLblPos[tmpLblPos.length - 1];

                element.labelElement = labelValue;
                element.labelPos = pos;
              });

              this.searchResults = map;
              console.log(this.searchResults);
              this.filterLoading = false;
            }
          },
          (error) => {
            console.log(error);
            this.filterLoading = false;
          }
        );
    } else {
      this.filterLoading = false;
    }
  }

  /**
   * Elimina i dati della ricerca.
   */
  deleteData() {
    this.searchResults = [];
  }

  /**
   * Metodo che gestisce le modifiche nei dati in input.
   * Aggiorna i dati del componente in base ai cambiamenti ricevuti.
   * @param changes Oggetti che rappresenta i cambiamenti nei dati in input.
   */
  ngOnChanges(changes: SimpleChanges) {
    setTimeout(() => {
      if (this.object != changes.lexData.currentValue) {
        // Pulisce gli array dei campi del form
        this.morphoTraits = this.coreForm.get('morphoTraits') as FormArray;
        this.morphoTraits.clear();

        this.denotesArray = this.coreForm.get('denotes') as FormArray;
        this.denotesArray.clear();

        this.cognatesArray = this.coreForm.get('cognates') as FormArray;
        this.cognatesArray.clear();

        this.evokesArray = this.coreForm.get('evokes') as FormArray;
        this.evokesArray.clear();

        this.disableAddCognates = false;
        this.disableAddDenotes = false;
        this.disableAddMorpho = false;
        this.disableAddEvokes = false;

        this.subtermArray = this.coreForm.get('subterm') as FormArray;
        this.subtermArray.clear();

        this.memoryStem = '';
        this.memoryPos = '';

        this.staticMorpho = [];

        this.memorySubterm = [];

        this.memoryCognates = [];

        this.isMultiword = false;
      }
      this.object = changes.lexData.currentValue;

      // Aggiorna i campi del form con i dati ricevuti
      if (this.object != null) {
        const lexId = this.object.lexicalEntry;
        this.coreForm
          .get('label')
          .setValue(this.object.label, { emitEvent: false });
        this.coreForm
          .get('stemType')
          .setValue(this.object.stemType, { emitEvent: false });
        if (this.object.stemType != '') {
          this.memoryStem = this.object.stemType;
        }
        if (this.object.type == 'Etymon') {
          this.coreForm
            .get('type')
            .disable({ onlySelf: true, emitEvent: false });
        } else {
          this.coreForm
            .get('type')
            .enable({ onlySelf: true, emitEvent: false });
        }

        if (this.object.confidence == 0) {
          // Accende l'interruttore di confidenza se il valore è 0
          this.coreForm
            .get('confidence')
            .patchValue(true, { emitEvent: false });
        } else {
          this.coreForm.get('confidence').setValue(null, { emitEvent: false });
        }

        // Imposta i valori dei tipi nel form
        this.object.type.forEach((element) => {
          if (element != 'Cognate') {
            this.coreForm.get('type').setValue(element, { emitEvent: false });
            return true;
          } else {
            return false;
          }
        });

        // Controlla se il tipo è Cognate o MultiWordExpression
        let isCognate = this.object.type.find(
          (element) => element == 'Cognate'
        );
        this.isMultiword = this.object.type.some(
          (element) => element == 'MultiWordExpression'
        );
        if (this.isMultiword) {
          this.getSubterms(lexId);
        }
        if (isCognate) {
          this.coreForm.get('isCognate').setValue(true, { emitEvent: false });
        } else {
          this.coreForm.get('isCognate').setValue(false, { emitEvent: false });
        }

        let isEtymon = this.object.type.find((element) => element == 'Etymon');
        if (isEtymon) {
          this.coreForm.get('isEtymon').setValue(true, { emitEvent: false });
        } else {
          this.coreForm.get('isEtymon').setValue(false, { emitEvent: false });
        }

        // Imposta i valori dei campi del form
        this.coreForm
          .get('language')
          .setValue(this.object.language, { emitEvent: false });
        this.coreForm
          .get('pos')
          .setValue(this.object.pos, { emitEvent: false });

        this.memoryPos = this.object.pos;

        this.valueTraits = [];
        this.memoryTraits = [];
        this.memoryDenotes = [];
        this.memoryCognates = [];
        this.memoryValues = [];
        this.memoryEvokes = [];
        this.memoryConfidence = null;

        // Ottiene i dati della morfologia e aggiorna il form
        setTimeout(async () => {
          this.morphologyData = await this.lexicalService
            .getMorphologyData()
            .toPromise();
          this.valuePos = this.morphologyData.filter((x) => {
            if (
              x.propertyId ==
              'http://www.lexinfo.net/ontology/3.0/lexinfo#partOfSpeech'
            ) {
              return true;
            } else {
              return false;
            }
          });
          this.valuePos = this.valuePos[0]['propertyValues'];

          for (var i = 0; i < this.object.morphology.length; i++) {
            const trait = this.object.morphology[i]['trait'];
            const value = this.object.morphology[i]['value'];

            let traitDescription = '';
            let labelTrait = this.object.morphology[i]['trait'].split('#')[1];
            let labelValue = this.object.morphology[i]['value'].split('#')[1];
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

            this.memoryValues[i] = this.object.morphology[i]['value'];

            let pos = this.coreForm.get('pos').value;
            this.valuePos.forEach((el) => {
              if (el.valueId.split('#')[1] == pos) {
                this.posDescription = el.valueDescription;
              }
            });

            this.addMorphoTraits(
              trait,
              value,
              traitDescription,
              labelTrait,
              labelValue
            );
            this.onChangeTrait(trait, i);

            this.staticMorpho.push({ trait: trait, value: value });
          }
        }, 50);

        // Ottiene i tipi di ingresso lessicali e aggiorna il form
        setTimeout(async () => {
          if (this.lexEntryTypesData.length == 0) {
            this.lexEntryTypesData = await this.lexicalService
              .getLexEntryTypes()
              .toPromise();
          }
          let type = this.coreForm.get('type').value;
          this.lexEntryTypesData.forEach((el) => {
            if (el.valueId.split('#')[1] == type) {
              this.coreForm
                .get('type')
                .setValue(el.valueId, { emitEvent: false });
              this.typeDesc = el.valueDescription;
            }
          });
        }, 100);

        // Ottiene e aggiorna le relazioni linguistiche dei campi denotes, evokes e cognates
        this.lexicalService
          .getLexEntryLinguisticRelation(lexId, 'denotes')
          .pipe(takeUntil(this.destroy$))
          .subscribe(
            (data) => {
              for (var i = 0; i < data.length; i++) {
                let entity = data[i]['entity'];
                let type = data[i]['linkType'];
                this.addDenotes(entity, type);
                this.memoryDenotes.push(data[i]);
              }
            },
            (error) => {
              console.log(error);
            }
          );

        this.lexicalService
          .getLexEntryLinguisticRelation(lexId, 'evokes')
          .pipe(takeUntil(this.destroy$))
          .subscribe(
            (data) => {
              console.log(data);
              for (var i = 0; i < data.length; i++) {
                let entity = data[i]['entity'];
                let type = data[i]['linkType'];
                let label = data[i]['label'];
                let inferred = data[i]['inferred'];
                this.addEvokes(entity, type, inferred, label);
                this.memoryEvokes.push(data[i]);
              }
            },
            (error) => {
              console.log(error);
            }
          );

        this.lexicalService
          .getLexEntryLinguisticRelation(lexId, 'cognate')
          .pipe(takeUntil(this.destroy$))
          .subscribe(
            (data) => {
              console.log(data);
              for (var i = 0; i < data.length; i++) {
                let label = data[i].label;
                let entity = data[i]['entity'];
                let type = data[i]['linkType'];
                let lexicalEntry = this.object.lexicalEntry;

                if (label == '') {
                  let tmp = entity.split('/');
                  label = tmp[tmp.length - 1];
                }
                this.addCognates(label, lexicalEntry, entity, type);
                this.memoryCognates.push(data[i]);
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
   * Ottiene i sottoelementi del termine lessicale specificato.
   * @param lexId ID del termine lessicale
   */
  async getSubterms(lexId) {
    try {
      let get_subterms_req = await this.lexicalService
        .getSubTerms(this.object.lexicalEntry)
        .toPromise();
      if (get_subterms_req != undefined) {
        Array.from(get_subterms_req).forEach((element: any) => {
          this.addSubterm(
            element.lexicalEntry,
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
          'Si è verificato un errore durante il recupero dei sottoelementi, si prega di controllare il log',
          'Errore',
          { timeOut: 5000 }
        );
      }
    }
  }

  /**
   * Attiva l'evento dei sottoelementi.
   * @param evt Evento
   */
  triggerSubterm(evt) {
    console.log(evt);
    if (evt.target != undefined) {
      this.subterm_subject.next(evt.target.value);
    }
  }

  /**
   * Gestisce il cambiamento di lingua del termine lessicale.
   * @param evt Evento
   */
  onChangeLanguage(evt) {
    this.lexicalService.spinnerAction('on');
    let langLabel = evt.target.value;
    let langValue;
    this.languages.forEach((element) => {
      if (element['label'].toLowerCase() == langLabel.toLowerCase()) {
        langValue = element['label'];
        return;
      }
    });

    if (langValue != undefined) {
      let lexId = this.object.lexicalEntry;
      let parameters = {
        relation: 'http://www.w3.org/ns/lemon/lime#entry',
        value: langValue,
      };

      this.lexicalService
        .updateLexicalEntry(lexId, parameters)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            //console.log(data)
            this.lexicalService.spinnerAction('off');
            this.lexicalService.updateCoreCard(data);
            data['request'] = 0;
            data['new_lang'] = langValue.toLowerCase();
            this.lexicalService.refreshAfterEdit(data);
            this.lexicalService.refreshLangTable();
            this.lexicalService.refreshFilter({ request: true });
          },
          (error) => {
            //console.log(error)
            const data = this.object;
            data['request'] = 0;
            data['new_lang'] = langValue.toLowerCase();
            this.lexicalService.refreshAfterEdit(data);
            this.lexicalService.spinnerAction('off');
            this.lexicalService.refreshLangTable();
            this.lexicalService.refreshFilter({ request: true });
            this.lexicalService.updateCoreCard({
              lastUpdate: error.error.text,
            });
            if (typeof error.error != 'object') {
              this.toastr.error(error.error, 'Errore', {
                timeOut: 5000,
              });
            } else {
              this.toastr.success(
                'Lingua cambiata correttamente per ' + lexId,
                '',
                {
                  timeOut: 5000,
                }
              );
            }
          }
        );
    } else {
      this.lexicalService.spinnerAction('off');
    }
  }

  /**
   * Gestisce l'evento di cambio di parte del discorso.
   * Aggiorna il valore della parte del discorso per un'unità lessicale e aggiorna la vista.
   * @param evt Evento che scatena la funzione
   */
  onChangePos(evt) {
    // Attiva lo spinner durante l'operazione
    this.lexicalService.spinnerAction('on');

    // Ottieni il valore della parte del discorso e l'ID dell'unità lessicale
    let posValue = evt.target.value;
    let lexId = this.object.lexicalEntry;
    let parameters;

    // Costruisci i parametri per la richiesta di aggiornamento
    if (this.memoryPos == '') {
      parameters = {
        type: 'morphology',
        relation: 'http://www.lexinfo.net/ontology/3.0/lexinfo#partOfSpeech',
        value: posValue,
      };
    } else {
      parameters = {
        type: 'morphology',
        relation: 'http://www.lexinfo.net/ontology/3.0/lexinfo#partOfSpeech',
        value: posValue,
        currentValue:
          'http://www.lexinfo.net/ontology/3.0/lexinfo#' + this.memoryPos,
      };
    }

    // Effettua la chiamata al servizio per aggiornare la relazione linguistica
    this.lexicalService
      .updateLinguisticRelation(lexId, parameters)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        // Successo
        (response) => {
          console.log(response);
          this.memoryPos = posValue;
          let data = {};
          data['request'] = 0;
          data['new_pos'] = posValue;
          data['lexicalEntry'] = this.object.lexicalEntry;
          this.lexicalService.spinnerAction('off');
          this.lexicalService.refreshAfterEdit(data);
          this.lexicalService.refreshFilter({ request: true });

          setTimeout(() => {
            // Aggiorna la descrizione della parte del discorso dopo un secondo
            this.valuePos.forEach((el) => {
              if (el.valueId == posValue) {
                this.posDescription = el.valueDescription;
              }
            });
            // Inizializza il tooltip per la parte del discorso
            //@ts-ignore
            $('.pos-tooltip').tooltip({
              trigger: 'hover',
            });
          }, 1000);
        },
        // Errore
        (error) => {
          console.log(error);

          this.lexicalService.spinnerAction('off');

          if (error.status != 200) {
            // Mostra un messaggio di errore se la richiesta fallisce
            this.toastr.error(error.error, 'Error', {
              timeOut: 5000,
            });
          } else {
            // Altrimenti, aggiorna i dati e mostra un messaggio di successo
            const data = this.object;
            data['request'] = 0;
            data['new_pos'] = posValue;
            this.lexicalService.refreshAfterEdit(data);
            this.lexicalService.refreshFilter({ request: true });
            this.lexicalService.updateCoreCard({
              lastUpdate: error.error.text,
            });
            this.memoryPos = posValue;
            this.toastr.success('Pos changed correctly for ' + lexId, '', {
              timeOut: 5000,
            });
          }
          setTimeout(() => {
            // Aggiorna la descrizione della parte del discorso dopo un secondo
            this.valuePos.forEach((el) => {
              if (el.valueId == posValue) {
                this.posDescription = el.valueDescription;
              }
            });
            // Inizializza il tooltip per la parte del discorso
            //@ts-ignore
            $('.pos-tooltip').tooltip({
              trigger: 'hover',
            });
          }, 1000);
        }
      );
  }

  /**
   * Gestisce l'evento di cambio di un valore esistente.
   * Aggiorna il valore di un tratto morfologico per un'unità lessicale e aggiorna la vista.
   * @param evt Evento che scatena la funzione
   * @param i Indice del tratto morfologico da modificare
   */
  onChangeExistingValue(evt, i) {
    // Attiva lo spinner durante l'operazione
    this.lexicalService.spinnerAction('on');
    this.morphoTraits = this.coreForm.get('morphoTraits') as FormArray;
    const trait = this.morphoTraits.at(i).get('trait').value;
    const oldValue = this.morphoTraits.at(i).get('value').value;
    const newValue = evt.target.value;
    if (newValue != '') {
      // Costruisci i parametri per la richiesta di aggiornamento
      let parameters = {
        type: 'morphology',
        relation: trait,
        value: newValue,
        currentValue: oldValue,
      };

      // Imposta il nuovo valore senza emettere eventi
      this.morphoTraits
        .at(i)
        .get('value')
        .setValue(newValue, { emitEvent: false });

      this.staticMorpho[i] = { trait: trait, value: newValue };
      let lexId = this.object.lexicalEntry;

      // Effettua la chiamata al servizio per aggiornare la relazione linguistica
      this.lexicalService
        .updateLinguisticRelation(lexId, parameters)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          // Successo
          (data) => {
            data['request'] = 0;
            // Aggiorna i dati e la vista dopo l'aggiornamento
            this.lexicalService.refreshAfterEdit(data);
            this.lexicalService.spinnerAction('off');
            this.lexicalService.refreshFilter({ request: true });
            this.lexicalService.updateCoreCard(data);
          },
          // Errore
          (error) => {
            this.lexicalService.refreshAfterEdit({
              request: 0,
              label: this.object.label,
            });
            this.lexicalService.spinnerAction('off');
            this.lexicalService.refreshFilter({ request: true });
            this.lexicalService.updateCoreCard({
              lastUpdate: error.error.text,
            });
            if (error.status != 200) {
              // Mostra un messaggio di errore se la richiesta fallisce
              this.toastr.error(error.error, 'Error', {
                timeOut: 5000,
              });
            } else {
              // Altrimenti, mostra un messaggio di successo
              this.toastr.success(
                'Morphotraits changed correctly for ' + lexId,
                '',
                {
                  timeOut: 5000,
                }
              );
            }
          }
        );
    } else {
      this.lexicalService.spinnerAction('on');
    }
  }

  /**
   * Funzione che gestisce l'evento di cambio valore di un attributo morfologico.
   * Aggiorna i valori morfologici nel servizio, effettua una chiamata API per aggiornare la relazione linguistica
   * e gestisce le risposte ottenute.
   *
   * @param i Indice dell'attributo morfologico
   */
  onChangeValue(i: number): void {
    // Attiva lo spinner
    this.lexicalService.spinnerAction('on');

    // Ottiene l'array dei tratti morfologici dal form
    this.morphoTraits = this.coreForm.get('morphoTraits') as FormArray;
    const trait = this.morphoTraits.at(i).get('trait').value;
    const value = this.morphoTraits.at(i).get('value').value;

    // Controlla se il tratto e il valore sono definiti
    if (trait !== '' && value !== '') {
      let parameters;

      // Costruisce i parametri per la chiamata API in base ai valori correnti e precedenti
      if (this.memoryValues[i] === '') {
        parameters = {
          type: 'morphology',
          relation: trait,
          value: value,
        };
      } else {
        parameters = {
          type: 'morphology',
          relation: trait,
          value: value,
          currentValue: this.memoryValues[i],
        };
      }

      // Aggiunge il tratto e il valore all'array staticMorpho
      this.staticMorpho.push({ trait: trait, value: value });

      // Ottiene l'ID lessicale corrente
      let lexId = this.object.lexicalEntry;

      // Effettua la chiamata API per aggiornare la relazione linguistica
      this.lexicalService
        .updateLinguisticRelation(lexId, parameters)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            // Aggiorna i dati e lo stato dell'interfaccia dopo l'aggiornamento
            data['request'] = 0;
            this.lexicalService.refreshAfterEdit(data);
            this.lexicalService.spinnerAction('off');
            this.lexicalService.refreshFilter({ request: true });
            this.lexicalService.updateCoreCard(data);
            this.disableAddMorpho = false;

            // Imposta una descrizione del tratto per il tooltip
            setTimeout(() => {
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

              // Inizializza il tooltip per il tratto
              //@ts-ignore
              $('.trait-tooltip').tooltip({
                trigger: 'hover',
              });
            }, 1000);
          },
          (error) => {
            // Gestisce gli errori nella risposta della chiamata API
            this.lexicalService.refreshAfterEdit({
              request: 0,
              label: this.object.label,
            });
            this.lexicalService.spinnerAction('off');
            this.lexicalService.refreshFilter({ request: true });
            this.disableAddMorpho = false;
            this.lexicalService.updateCoreCard({
              lastUpdate: error.error.text,
            });
            setTimeout(() => {
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

              // Aggiorna il tratto morfologico nel form con la descrizione e inizializza il tooltip
              this.morphoTraits = this.coreForm.get(
                'morphoTraits'
              ) as FormArray;
              this.morphoTraits.at(i).patchValue({
                trait: trait,
                value: value,
                description: traitDescription,
              });

              //@ts-ignore
              $('.trait-tooltip').tooltip({
                trigger: 'hover',
              });

              // Visualizza un messaggio di errore tramite Toastr se l'errore non è un oggetto oppure un messaggio di successo
              if (typeof error.error != 'object') {
                this.toastr.error(error.error, 'Error', {
                  timeOut: 5000,
                });
              } else {
                this.toastr.success(
                  'Morphotraits changed correctly for ' + lexId,
                  '',
                  {
                    timeOut: 5000,
                  }
                );
              }
            }, 1000);
          }
        );
    } else {
      // Disattiva lo spinner se il tratto o il valore non sono definiti
      this.lexicalService.spinnerAction('off');
    }
  }

  /**
   * Funzione che gestisce l'evento di cambio tratto morfologico.
   * Aggiorna il tratto morfologico nel form e le relative opzioni dei valori.
   *
   * @param evt Evento di cambio
   * @param i Indice dell'attributo morfologico
   */
  onChangeTrait(evt: any, i: number): void {
    // Controlla se l'evento è definito
    if (evt.target !== undefined) {
      setTimeout(() => {
        // Ottiene l'array dei tratti morfologici dal form e aggiorna il tratto selezionato nel form
        this.morphoTraits = this.coreForm.get('morphoTraits') as FormArray;
        this.morphoTraits
          .at(i)
          .patchValue({ trait: evt.target.value, value: '' });

        // Ottiene i valori possibili per il tratto selezionato e aggiorna i valori e i tratti memorizzati
        if (evt.target.value !== '') {
          let arrayValues = this.morphologyData.filter((x) => {
            return x['propertyId'] == evt.target.value;
          })['0']['propertyValues'];
          this.valueTraits[i] = arrayValues;
          this.memoryTraits[i] = evt.target.value;
          this.memoryValues[i] = '';
        } else {
          // Se il tratto è vuoto, rimuove il tratto e i valori memorizzati
          this.memoryValues.splice(i, 1);
          let arrayValues = [];
          this.valueTraits[i] = arrayValues;
          this.memoryTraits.splice(i, 1);
        }
      }, 500);
    } else {
      // Se l'evento non è definito, ottiene i valori possibili per il tratto selezionato e aggiorna i valori e i tratti memorizzati
      setTimeout(() => {
        try {
          var arrayValues = this.morphologyData.filter((x) => {
            return x['propertyId'] == evt;
          })['0']['propertyValues'];
          this.valueTraits[i] = arrayValues;
          this.memoryTraits.push(evt);
        } catch (e) {
          console.log(e);
        }
      }, 1000);
    }
  }

  /**
   * Funzione che gestisce gli eventi di modifica del campo 'label' nel form principale.
   */
  onChanges(): void {
    this.coreForm
      .get('label')
      .valueChanges.pipe(debounceTime(3000), takeUntil(this.destroy$))
      .subscribe((updatedLabel) => {
        if (updatedLabel.length >= 2 && updatedLabel.trim() != '') {
          this.emptyLabelFlag = false;
          this.lexicalService.spinnerAction('on');
          let lexId = this.object.lexicalEntry;
          let parameters = {
            relation: 'http://www.w3.org/2000/01/rdf-schema#label',
            value: updatedLabel,
          };
          // Aggiorna l'etichetta nell'oggetto LexicalEntry e nel database
          this.lexicalService
            .updateLexicalEntry(lexId, parameters)
            .pipe(takeUntil(this.destroy$))
            .subscribe(
              (data) => {
                console.log(data);
                data['request'] = 0;
                data['new_label'] = updatedLabel;
                this.lexicalService.refreshAfterEdit(data);
                this.lexicalService.spinnerAction('off');
                this.lexicalService.updateCoreCard(data);
              },
              (error) => {
                console.log(error);
                const data = this.object;
                data['request'] = 0;
                data['new_label'] = updatedLabel;
                this.lexicalService.refreshAfterEdit(data);
                this.lexicalService.spinnerAction('off');
                this.lexicalService.updateCoreCard({
                  lastUpdate: error.error.text,
                });
                this.lexicalService.changeDecompLabel(updatedLabel);
                if (typeof error.error != 'object') {
                  this.toastr.error(error.error, 'Error', {
                    timeOut: 5000,
                  });
                } else {
                  this.toastr.success(
                    'Label changed correctly for ' + lexId,
                    '',
                    {
                      timeOut: 5000,
                    }
                  );
                }
              }
            );
        } else if (updatedLabel.length < 3) {
          this.emptyLabelFlag = true;
        }
      });

    // Gestione dell'evento di modifica del campo 'confidence'
    this.coreForm
      .get('confidence')
      .valueChanges.pipe(
        debounceTime(3000),
        startWith(this.coreForm.get('confidence').value),
        pairwise(),
        takeUntil(this.destroy$)
      )
      .subscribe(([prev, next]: [any, any]) => {
        let lexId = this.object.lexicalEntry;

        this.coreForm.get('confidence').setValue(next, { emitEvent: false });

        let oldValue = prev ? 0 : 1;
        let newValue = next ? 0 : 1;
        let parameters = {
          relation: 'http://www.lexinfo.net/ontology/3.0/lexinfo#confidence',
          value: newValue,
        };

        //if (this.memoryConfidence != null) parameters['currentValue'] = oldValue;
        this.memoryConfidence = oldValue;

        this.lexicalService
          .updateLexicalEntry(lexId, parameters)
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

    // Gestione dell'evento di modifica del campo 'stemType'
    this.coreForm
      .get('stemType')
      .valueChanges.pipe(debounceTime(3000), takeUntil(this.destroy$))
      .subscribe((updateStem) => {
        if (updateStem != '') {
          this.lexicalService.spinnerAction('on');
          let lexId = this.object.lexicalEntry;
          let parameters = {
            type: 'extension',
            relation: 'https://www.prin-italia-antica.unifi.it#stemType',
            value: updateStem,
          };
          if (this.memoryStem != '')
            parameters['currentValue'] = this.memoryStem;
          console.log(parameters);
          this.lexicalService
            .updateGenericRelation(lexId, parameters)
            .pipe(takeUntil(this.destroy$))
            .subscribe(
              (data) => {
                console.log(data);

                this.lexicalService.spinnerAction('off');
                this.lexicalService.updateCoreCard(data);
              },
              (error) => {
                console.log(error);

                this.lexicalService.spinnerAction('off');
                this.lexicalService.updateCoreCard({
                  lastUpdate: error.error.text,
                });
                if (typeof error.error != 'object') {
                  this.toastr.error(error.error, 'Error', {
                    timeOut: 5000,
                  });
                } else {
                  this.memoryStem = updateStem;
                  this.toastr.success(
                    'stemType changed correctly for ' + lexId,
                    '',
                    {
                      timeOut: 5000,
                    }
                  );
                }
              }
            );
        } else {
          this.toastr.error('Empty value not allowed');
        }
      });

    // Gestione dell'evento di modifica del campo 'type'
    this.coreForm
      .get('type')
      .valueChanges.pipe(debounceTime(3000), takeUntil(this.destroy$))
      .subscribe((newType) => {
        this.lexicalService.spinnerAction('on');
        let lexId = this.object.lexicalEntry;
        let parameters = {
          relation: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
          value: newType,
        };
        this.lexicalService
          .updateLexicalEntry(lexId, parameters)
          .pipe(takeUntil(this.destroy$))
          .subscribe(
            (data) => {
              //console.log(data);
              this.lexicalService.spinnerAction('off');
              data['request'] = 0;
              data['new_type'] = newType;
              this.lexicalService.refreshAfterEdit(data);
              this.lexicalService.refreshFilter({ request: true });
              this.lexicalService.updateCoreCard(data);

              setTimeout(() => {
                let type = this.coreForm.get('type').value;
                this.lexEntryTypesData.forEach((el) => {
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
              //console.log(error);
              const data = this.object;
              data['request'] = 0;
              data['new_type'] = newType;
              this.lexicalService.refreshAfterEdit(data);
              this.lexicalService.spinnerAction('off');
              this.lexicalService.updateCoreCard({
                lastUpdate: error.error.text,
              });
              this.lexicalService.refreshFilter({ request: true });
              if (typeof error.error != 'object') {
                this.toastr.error(error.error, 'Error', {
                  timeOut: 5000,
                });
              } else {
                this.toastr.success('Type changed correctly for ' + lexId, '', {
                  timeOut: 5000,
                });
              }
              setTimeout(() => {
                let type = this.coreForm.get('type').value;
                this.lexEntryTypesData.forEach((el) => {
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
      });
  }

  /**
   * Crea un FormGroup per i tratti morfologici.
   *
   * @param t Il valore del tratto morfologico.
   * @param v Il valore associato al tratto morfologico.
   * @param d La descrizione del tratto morfologico.
   * @param lT L'etichetta del tratto morfologico.
   * @param lV L'etichetta del valore associato al tratto morfologico.
   * @returns Il FormGroup creato.
   */
  createMorphoTraits(t?, v?, d?, lT?, lV?): FormGroup {
    if (t != undefined) {
      return this.formBuilder.group({
        trait: new FormControl(t, [
          Validators.required,
          Validators.minLength(0),
        ]),
        labelTrait: new FormControl(lT),
        labelValue: new FormControl(lV),
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
        labelTrait: new FormControl(''),
        labelValue: new FormControl(''),
        value: new FormControl('', [
          Validators.required,
          Validators.minLength(0),
        ]),
        description: new FormControl(null, [
          Validators.required,
          Validators.minLength(0),
        ]),
      });
    }
  }

  /**
   * Crea un FormGroup per gli elementi evocati.
   *
   * @param e L'entità evocata.
   * @param t Il tipo dell'entità evocata.
   * @param i Se l'entità è inferita o meno.
   * @param l L'etichetta dell'entità evocata.
   * @returns Il FormGroup creato.
   */
  createEvokes(e?, t?, i?, l?): FormGroup {
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
   * Crea un FormGroup per gli elementi denotati.
   *
   * @param e L'entità denotata.
   * @param t Il tipo dell'entità denotata.
   * @returns Il FormGroup creato.
   */
  createDenotes(e?, t?): FormGroup {
    if (e != undefined) {
      return this.formBuilder.group({
        entity: new FormControl(e, [
          Validators.required,
          Validators.pattern(this.urlRegex),
        ]),
        type: t,
      });
    } else {
      return this.formBuilder.group({
        entity: new FormControl(null, [
          Validators.required,
          Validators.pattern(this.urlRegex),
        ]),
        type: null,
      });
    }
  }

  /**
   * Crea un FormGroup per i cognati.
   *
   * @param l L'etichetta del cognato.
   * @param lexName Il nome della voce lessicale associata al cognato.
   * @param e L'entità del cognato.
   * @param t Il tipo dell'entità del cognato.
   * @param lila Indica se il cognato è un cognato LI.LA.
   * @returns Il FormGroup creato.
   */
  createCognates(l?, lexName?, e?, t?, lila?): FormGroup {
    if (e != undefined) {
      return this.formBuilder.group({
        label: new FormControl(l, [Validators.required]),
        lexicalEntry: new FormControl(lexName, [Validators.required]),
        entity: new FormControl(e, [
          Validators.required,
          Validators.pattern(this.urlRegex),
        ]),
        type: t,
        lila: lila,
      });
    } else {
      return this.formBuilder.group({
        label: new FormControl(null, [Validators.required]),
        lexicalEntry: new FormControl(null, [Validators.required]),
        entity: new FormControl(null, [
          Validators.required,
          Validators.pattern(this.urlRegex),
        ]),
        type: null,
        lila: false,
      });
    }
  }

  /**
   * Crea un FormGroup per il componente del sotto-termine.
   *
   * @param e L'entità del sotto-termine.
   * @param l L'etichetta del sotto-termine.
   * @param lang La lingua del sotto-termine.
   * @returns Il FormGroup creato.
   */
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

  /**
   * Aggiunge un sotto-termine.
   *
   * @param e L'entità del sotto-termine.
   * @param label L'etichetta del sotto-termine.
   * @param lang La lingua del sotto-termine.
   */
  addSubterm(e?, label?, lang?) {
    this.subtermArray = this.coreForm.get('subterm') as FormArray;

    if (e != undefined) {
      this.subtermArray.push(this.createSubtermComponent(e, label, lang));
      this.disableAddSubterm = false;
    } else {
      this.subtermArray.push(this.createSubtermComponent());
      this.disableAddSubterm = true;
    }
  }

  /**
   * Gestisce l'evento di denotazione.
   *
   * @param evt L'evento scatenante.
   * @param i L'indice dell'elemento associato.
   */
  handleDenotes(evt, i) {
    if (evt instanceof NgSelectComponent) {
      if (evt.selectedItems.length > 0) {
        let label = evt.selectedItems[0]['value']['lexicalEntry'];
        this.onChangeDenotes({ name: label, i: i });
      }
    } else {
      let label = evt.target.value;
      this.denotes_subject.next({ name: label, i: i });
    }
  }

  /**
   * Gestisce l'evento dei cognati.
   *
   * @param evt L'evento scatenante.
   * @param i L'indice dell'elemento associato.
   */
  handleCognates(evt, i) {
    if (evt instanceof NgSelectComponent) {
      if (evt.selectedItems.length > 0) {
        console.log(evt.selectedItems[0]);
        let label = '';
        let instanceName = '';
        if (evt.selectedItems[0]['value']['lexicalEntry'] == undefined) {
          label = evt.selectedItems[0]['value']['label'];
          instanceName = evt.selectedItems[0]['value']['labelValue'];
        } else {
          label = evt.selectedItems[0]['value']['lexicalEntry'];
          instanceName = evt.selectedItems[0]['value']['lexicalEntry'];
        }
        this.onChangeCognates({
          name: label,
          i: i,
          instance_name: instanceName,
        });
      }
    } else {
      let label = evt.target.value;
      this.cognates_subject.next({
        instance_name: label,
        i: i,
        external: true,
      });
    }
  }

  /**
   * Gestisce l'evento del sotto-termine.
   *
   * @param evt L'evento scatenante.
   * @param i L'indice dell'elemento associato.
   */
  handleSubterm(evt, i) {
    if (evt instanceof NgSelectComponent) {
      if (evt.selectedItems.length > 0) {
        console.log(evt.selectedItems[0]);
        let label = evt.selectedItems[0]['value']['label'];
        let lexId = evt.selectedItems[0]['value']['lexicalEntry'];
        this.onChangeSubterm({
          name: label,
          lexicalEntry: lexId,
          i: i,
          object: evt.selectedItems[0]['value'],
        });
      }
    } else {
      let label = evt.target.value;
      this.ext_subterm_subject.next({ lexicalEntry: label, i: i });
    }
  }

  /**
   * Funzione asincrona che gestisce l'evento di cambiamento di un sottotermo.
   * @param data Dati relativi al cambiamento del sottotermo.
   */
  async onChangeSubterm(data) {
    var index = data['i'];
    this.subtermArray = this.coreForm.get('subterm') as FormArray;
    if (this.memorySubterm[index] == undefined) {
      const newValue = data['lexicalEntry'];
      const parameters = {
        type: 'decomp',
        relation: 'http://www.w3.org/ns/lemon/decomp#subterm',
        value: newValue,
      };
      console.log(parameters);

      this.object['request'] = 'subterm';
      let lexId = this.object.lexicalEntry;

      try {
        let change_subterm_req = await this.lexicalService
          .updateLinguisticRelation(lexId, parameters)
          .toPromise();
        console.log(change_subterm_req);
        this.lexicalService.spinnerAction('off');
        /* data['request'] = 0;
                this.lexicalService.refreshAfterEdit(data); */
        //this.lexicalService.updateLexCard(data) TODO: inserire updater per decomp qua
        this.memorySubterm[index] = change_subterm_req;

        this.subtermArray.at(index).patchValue({
          entity: change_subterm_req.object.label,
          label: change_subterm_req['label'],
          language: change_subterm_req['language'],
        });
        this.disableAddSubterm = false;

        this.lexicalService.addSubElementRequest({
          lex: this.object,
          data: change_subterm_req,
        });
      } catch (error) {
        this.lexicalService.spinnerAction('off');
        if (error.status == 200) {
          this.toastr.success('Subterm changed correctly for ' + lexId, '', {
            timeOut: 5000,
          });

          this.disableAddSubterm = false;
          this.memorySubterm[index] = this.object;
          data['request'] = 'subterm';
          this.subtermArray.at(index).patchValue({
            entity: newValue,
            label: data.object.label,
            language: data.object.language,
          });
          this.lexicalService.addSubElementRequest({
            lex: this.object,
            data: data['object'],
          });
          //this.lexicalService.updateLexCard({ lastUpdate: error.error.text })
        } else {
          this.toastr.error(error.error, 'Error', {
            timeOut: 5000,
          });
        }
      }
    } else {
      const oldValue = this.memorySubterm[index]['lexicalEntry'];
      const newValue = data['lexicalEntry'];
      const parameters = {
        type: 'decomp',
        relation: 'http://www.w3.org/ns/lemon/decomp#subterm',
        value: newValue,
        currentValue: oldValue,
      };

      let lexId = this.object.lexicalEntry;
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
   * Funzione che gestisce l'evento di cambiamento di un elemento denotativo.
   * @param data Dati relativi al cambiamento dell'elemento denotativo.
   */
  onChangeDenotes(data) {
    if (data['name'] != '') {
      var index = data['i'];
      this.denotesArray = this.coreForm.get('denotes') as FormArray;
      if (this.memoryDenotes[index] == undefined) {
        const newValue = data['name'];
        const parameters = {
          type: 'conceptRef',
          relation: 'http://www.w3.org/ns/lemon/ontolex#denotes',
          value: newValue,
        };
        //console.log(parameters)
        let lexId = this.object.lexicalEntry;
        this.lexicalService
          .updateLinguisticRelation(lexId, parameters)
          .pipe(takeUntil(this.destroy$))
          .subscribe(
            (data) => {
              console.log(data);
              this.disableAddDenotes = false;
              this.lexicalService.spinnerAction('off');
              data['request'] = 0;
              this.lexicalService.refreshAfterEdit(data);
              this.lexicalService.updateCoreCard(data);
            },
            (error) => {
              console.log(error);

              /* this.toastr.error(error.error, 'Error', {
                            timeOut: 5000,
                        }); */

              this.lexicalService.spinnerAction('off');
              if (error.status == 200) {
                this.lexicalService.updateCoreCard({
                  lastUpdate: error.error.text,
                });
                this.toastr.success(
                  'Denotes changed correctly for ' + lexId,
                  '',
                  {
                    timeOut: 5000,
                  }
                );
                this.disableAddDenotes = false;
              } else {
                this.toastr.error(error.error, 'Error', {
                  timeOut: 5000,
                });
              }
            }
          );
        this.memoryDenotes[index] = data;
      } else {
        const oldValue = this.memoryDenotes[index]['entity'];
        const newValue = data['name'];
        const parameters = {
          type: 'conceptRef',
          relation: 'http://www.w3.org/ns/lemon/ontolex#denotes',
          value: newValue,
          currentValue: oldValue,
        };

        let lexId = this.object.lexicalEntry;
        //console.log(parameters)
        this.lexicalService
          .updateLinguisticRelation(lexId, parameters)
          .pipe(takeUntil(this.destroy$))
          .subscribe(
            (data) => {
              console.log(data);
              this.lexicalService.spinnerAction('off');
              this.lexicalService.updateCoreCard(data);
              data['request'] = 0;
              this.lexicalService.refreshAfterEdit(data);
              this.disableAddDenotes = false;
            },
            (error) => {
              console.log(error);
              if (error.status == 200) {
                const data = this.object;
                data['request'] = 0;

                //this.lexicalService.refreshAfterEdit(data);
                this.lexicalService.updateCoreCard({
                  lastUpdate: error.error.text,
                });
                this.lexicalService.spinnerAction('off');
                this.toastr.success(
                  'Denotes changed correctly for ' + lexId,
                  '',
                  {
                    timeOut: 5000,
                  }
                );
                this.disableAddDenotes = false;
              } else {
                this.toastr.error(error.error, 'Error', {
                  timeOut: 5000,
                });
              }
            }
          );
        this.memoryDenotes[index] = data;
      }
    } else {
      this.toastr.error('Empty value not allowed');
    }
  }

  /**
   * Funzione chiamata quando avviene un cambiamento nella sezione 'Evokes'.
   * Gestisce l'aggiunta, la modifica e la rimozione delle relazioni linguistiche di tipo 'evokes'.
   * @param data Oggetto contenente i dati relativi alla modifica, inclusi il nome e l'indice dell'elemento modificato.
   */
  onChangeEvokes(data) {
    if (data['name'] != '') {
      var index = data['i'];
      this.evokesArray = this.coreForm.get('evokes') as FormArray;
      if (this.memoryEvokes[index] == undefined) {
        // Se l'elemento non esiste nella memoria, lo aggiunge come nuova relazione linguistica 'evokes'.
        const newValue = data['name'];
        const parameters = {
          type: 'conceptRel',
          relation: 'http://www.w3.org/ns/lemon/ontolex#evokes',
          value: newValue,
        };
        //console.log(parameters)
        let lexId = this.object.lexicalEntry;

        this.lexicalService
          .updateLinguisticRelation(lexId, parameters)
          .pipe(takeUntil(this.destroy$))
          .subscribe(
            (data) => {
              console.log(data);
              this.disableAddDenotes = false;
              this.lexicalService.spinnerAction('off');
              data['request'] = 0;
              this.lexicalService.refreshAfterEdit(data);
              this.lexicalService.updateCoreCard(data);
            },
            (error) => {
              console.log(error);

              /* this.toastr.error(error.error, 'Error', {
                            timeOut: 5000,
                        }); */

              this.lexicalService.spinnerAction('off');
              if (error.status == 200) {
                this.lexicalService.updateCoreCard({
                  lastUpdate: error.error.text,
                });
                this.toastr.success(
                  'Evokes changed correctly for ' + lexId,
                  '',
                  {
                    timeOut: 5000,
                  }
                );
                this.disableAddEvokes = false;
                this.memoryEvokes[index] = data;
              } else {
                this.toastr.error(error.error, 'Error', {
                  timeOut: 5000,
                });
              }
            }
          );
      } else {
        // Se l'elemento esiste nella memoria, aggiorna la relazione linguistica 'evokes'.
        const oldValue =
          this.memoryEvokes[index]['entity'] == undefined
            ? this.memoryEvokes[index]['name']
            : this.memoryEvokes[index]['entity'];
        const newValue = data['name'];
        const parameters = {
          type: 'conceptRel',
          relation: 'http://www.w3.org/ns/lemon/ontolex#evokes',
          value: newValue,
          currentValue: oldValue,
        };

        let lexId = this.object.lexicalEntry;
        //console.log(parameters)
        this.lexicalService
          .updateLinguisticRelation(lexId, parameters)
          .pipe(takeUntil(this.destroy$))
          .subscribe(
            (data) => {
              console.log(data);
              this.lexicalService.spinnerAction('off');
              this.lexicalService.updateCoreCard(data);
              data['request'] = 0;
              this.lexicalService.refreshAfterEdit(data);
              this.disableAddEvokes = false;
            },
            (error) => {
              console.log(error);
              if (error.status == 200) {
                const data = this.object;
                data['request'] = 0;

                //this.lexicalService.refreshAfterEdit(data);
                this.lexicalService.updateCoreCard({
                  lastUpdate: error.error.text,
                });
                this.lexicalService.spinnerAction('off');
                this.toastr.success(
                  'Denotes changed correctly for ' + lexId,
                  '',
                  {
                    timeOut: 5000,
                  }
                );
                this.disableAddEvokes = false;
                this.memoryEvokes[index] = data;
              } else {
                this.toastr.error(error.error, 'Error', {
                  timeOut: 5000,
                });
              }
            }
          );
      }
    } else {
      this.toastr.error('Empty value not allowed');
    }
  }

  /**
   * Funzione chiamata quando avviene un cambiamento nella sezione 'Cognates'.
   * Gestisce l'aggiunta, la modifica e la rimozione delle relazioni linguistiche di tipo 'cognate'.
   * @param data Oggetto contenente i dati relativi alla modifica, inclusi il nome e l'indice dell'elemento modificato.
   */
  onChangeCognates(data) {
    var index = data['i'];
    this.cognatesArray = this.coreForm.get('cognates') as FormArray;

    let existOrNot = this.memoryCognates.some(
      (element) =>
        element?.entity == data.instance_name ||
        element?.name == data.instance_name
    );

    if (this.memoryCognates[index] == undefined && !existOrNot) {
      // Se l'elemento non esiste nella memoria e non è già presente, lo aggiunge come nuova relazione linguistica 'cognate'.
      let newValue = '';
      if (this.cognatesArray.at(index).get('lila').value) {
        newValue = data.instance_name;
      } else {
        newValue = data.instance_name;
      }

      const parameters = {
        type: 'lexicalRel',
        relation: 'http://lari-datasets.ilc.cnr.it/lemonEty#cognate',
        value: newValue,
      };
      console.log(parameters);
      let lexId = this.object.lexicalEntry;
      this.lexicalService
        .updateLinguisticRelation(lexId, parameters)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            console.log(data);
            this.lexicalService.spinnerAction('off');
            data['request'] = 0;
            this.lexicalService.refreshAfterEdit(data);
            this.lexicalService.updateCoreCard(data);
            this.disableAddCognates = false;
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
              this.disableAddCognates = false;
              this.toastr.success(
                'Cognates changed correctly for ' + lexId,
                '',
                {
                  timeOut: 5000,
                }
              );

              if (this.cognatesArray.at(index).get('lila').value) {
                this.cognatesArray
                  .at(index)
                  .get('entity')
                  .setValue(data.instance_name, { emitEvent: false });
                this.cognatesArray
                  .at(index)
                  .get('type')
                  .setValue('external', { emitEvent: false });
                this.cognatesArray
                  .at(index)
                  .get('lila')
                  .setValue(true, { emitEvent: false });
              } else {
                this.cognatesArray
                  .at(index)
                  .get('lexicalEntry')
                  .setValue(this.object.lexicalEntry, { emitEvent: false });
                this.cognatesArray
                  .at(index)
                  .get('entity')
                  .setValue(data.instance_name, { emitEvent: false });
                if (data.external) {
                  this.cognatesArray
                    .at(index)
                    .get('type')
                    .setValue('external', { emitEvent: false });
                } else {
                  this.cognatesArray
                    .at(index)
                    .get('type')
                    .setValue('internal', { emitEvent: false });
                }

                this.cognatesArray
                  .at(index)
                  .get('lila')
                  .setValue(false, { emitEvent: false });
              }
            } else {
              this.toastr.error(error.error, 'Error', {
                timeOut: 5000,
              });
            }
          }
        );
      this.memoryCognates[index] = data;
    } else if (this.memoryCognates[index] != undefined && !existOrNot) {
      // Se l'elemento esiste nella memoria e non è già presente, aggiorna la relazione linguistica 'cognate'.
      const oldValue =
        this.memoryCognates[index]['entity'] == undefined
          ? this.memoryCognates[index]['instance_name']
          : this.memoryCognates[index]['entity'];
      const newValue = data['instance_name'];
      const parameters = {
        type: 'lexicalRel',
        relation: 'http://lari-datasets.ilc.cnr.it/lemonEty#cognate',
        value: newValue,
        currentValue: oldValue,
      };

      let lexId = this.object.lexicalEntry;
      console.log(parameters);
      this.lexicalService
        .updateLinguisticRelation(lexId, parameters)
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
            /* const data = this.object;
                    data['request'] = 0; */

            //this.lexicalService.refreshAfterEdit(data);
            this.lexicalService.updateCoreCard({
              lastUpdate: error.error.text,
            });
            this.lexicalService.spinnerAction('off');
            if (error.status == 200) {
              this.toastr.success('Label changed correctly for ' + lexId, '', {
                timeOut: 5000,
              });

              if (this.cognatesArray.at(index).get('lila').value) {
                this.cognatesArray
                  .at(index)
                  .get('entity')
                  .setValue(data.instance_name, { emitEvent: false });
                this.cognatesArray
                  .at(index)
                  .get('type')
                  .setValue('external', { emitEvent: false });
                this.cognatesArray
                  .at(index)
                  .get('lila')
                  .setValue(true, { emitEvent: false });
              } else {
                this.cognatesArray
                  .at(index)
                  .get('lexicalEntry')
                  .setValue(this.object.lexicalEntry, { emitEvent: false });
                this.cognatesArray
                  .at(index)
                  .get('entity')
                  .setValue(data.instance_name, { emitEvent: false });
                if (data.external) {
                  this.cognatesArray
                    .at(index)
                    .get('type')
                    .setValue('external', { emitEvent: false });
                } else {
                  this.cognatesArray
                    .at(index)
                    .get('type')
                    .setValue('internal', { emitEvent: false });
                }

                this.cognatesArray
                  .at(index)
                  .get('lila')
                  .setValue(false, { emitEvent: false });
              }
            } else {
              this.toastr.error(error.error, 'Error', {
                timeOut: 5000,
              });
            }
          }
        );
      this.memoryCognates[index] = data;
    } else if (existOrNot) {
      // Se l'elemento è già presente, mostra un messaggio di errore.
      this.toastr.error(
        'This cognates already exist in this lexical entry',
        'Error',
        {
          timeOut: 5000,
        }
      );
    }
  }

  /**
   * Gestisce gli eventi scatenati (evokes).
   * @param evt Evento scatenato
   * @param i Indice dell'elemento
   */
  handleEvokes(evt, i) {
    if (evt instanceof NgSelectComponent) {
      if (evt.selectedItems.length > 0) {
        let label = evt.selectedItems[0].value['lexicalConcept'];
        this.onChangeEvokes({ name: label, i: i });
      }
    } else {
      let label = evt.target.value;
      this.evokes_subject.next({ name: label, i: i });
    }
  }

  /**
   * Aggiunge una nuova relazione di "denotes".
   * @param e Entità
   * @param t Tipo
   */
  addDenotes(e?, t?) {
    this.denotesArray = this.coreForm.get('denotes') as FormArray;
    if (e != undefined) {
      this.denotesArray.push(this.createDenotes(e, t));
    } else {
      this.disableAddDenotes = true;
      this.denotesArray.push(this.createDenotes());
    }
  }

  /**
   * Aggiunge una nuova relazione di "evokes".
   * @param e Evento
   * @param t Tipo
   * @param i Indice
   * @param l Etichetta
   */
  addEvokes(e?, t?, i?, l?) {
    this.evokesArray = this.coreForm.get('evokes') as FormArray;
    if (e != undefined) {
      this.evokesArray.push(this.createEvokes(e, t, i, l));
    } else {
      this.disableAddEvokes = true;
      this.evokesArray.push(this.createEvokes());
    }
  }

  /**
   * Aggiunge nuovi cognati.
   * @param l Etichetta
   * @param lexIn LexIn
   * @param e Evento
   * @param t Tipo
   */
  addCognates(l?, lexIn?, e?, t?) {
    setTimeout(() => {
      //@ts-ignore
      $('.cognates-tooltip').tooltip({
        trigger: 'hover',
      });
    }, 1000);
    this.cognatesArray = this.coreForm.get('cognates') as FormArray;
    if (e != undefined) {
      let lila = false;
      if (e.includes('lila')) {
        lila = true;
      }
      this.cognatesArray.push(this.createCognates(l, lexIn, e, t, lila));
    } else {
      this.disableAddCognates = true;
      this.cognatesArray.push(this.createCognates());
    }
  }

  /**
   * Aggiunge nuovi tratti morfologici.
   * @param t Tipo
   * @param v Valore
   * @param d Descrizione
   * @param lT Label tipo
   * @param lV Label valore
   */
  addMorphoTraits(t?, v?, d?, lT?, lV?) {
    this.morphoTraits = this.coreForm.get('morphoTraits') as FormArray;
    if (t != undefined) {
      this.morphoTraits.push(this.createMorphoTraits(t, v, d, lT, lV));
    } else {
      this.disableAddMorpho = true;
      this.morphoTraits.push(this.createMorphoTraits());
    }
  }

  /**
   * Rimuove un elemento.
   * @param index Indice dell'elemento da rimuovere
   */
  removeElement(index) {
    this.memoryTraits.splice(index, 1);
    this.valueTraits.splice(index, 1);
    this.staticMorpho.splice(index, 1);

    this.morphoTraits = this.coreForm.get('morphoTraits') as FormArray;

    const trait = this.morphoTraits.at(index).get('trait').value;
    const value = this.morphoTraits.at(index).get('value').value;

    if (trait != '') {
      let lexId = this.object.lexicalEntry;

      let parameters = {
        type: 'morphology',
        relation: trait,
        value: value,
      };

      //console.log(parameters)

      this.lexicalService
        .deleteLinguisticRelation(lexId, parameters)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            //console.log(data)
            this.lexicalService.updateCoreCard(this.object);
            this.lexicalService.refreshAfterEdit({
              request: 0,
              label: this.object.label,
            });
            this.lexicalService.spinnerAction('off');
            this.lexicalService.refreshFilter({ request: true });
            this.toastr.success(
              'Elemento rimosso correttamente per ' + lexId,
              '',
              {
                timeOut: 5000,
              }
            );
          },
          (error) => {
            //console.log(error)
            this.lexicalService.refreshAfterEdit({
              request: 0,
              label: this.object.label,
            });
            this.lexicalService.spinnerAction('off');
            this.lexicalService.refreshFilter({ request: true });
            this.lexicalService.updateCoreCard({
              lastUpdate: error.error.text,
            });
            if (error.status != 200) {
              this.toastr.error(error.error, 'Errore', {
                timeOut: 5000,
              });
            } else {
              this.toastr.success(
                'Elemento rimosso correttamente per ' + lexId,
                '',
                {
                  timeOut: 5000,
                }
              );
            }
          }
        );
    } else {
      this.disableAddMorpho = false;
    }

    this.morphoTraits.removeAt(index);
  }

  /**
   * Rimuove la relazione di "denotes".
   * @param index Indice della relazione da rimuovere
   */
  removeDenotes(index) {
    this.disableAddDenotes = false;
    this.denotesArray = this.coreForm.get('denotes') as FormArray;

    const entity = this.denotesArray.at(index).get('entity').value;

    let lexId = this.object.lexicalEntry;

    let parameters = {
      relation: 'http://www.w3.org/ns/lemon/ontolex#denotes',
      value: entity,
    };

    if (entity != '') {
      this.lexicalService
        .deleteLinguisticRelation(lexId, parameters)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            console.log(data);
            this.lexicalService.updateCoreCard(this.object);
            this.toastr.success('Denotes rimosso', '', {
              timeOut: 5000,
            });
          },
          (error) => {
            console.log(error);
            //this.lexicalService.updateCoreCard({ lastUpdate: error.error.text })
            this.toastr.error(error.error, 'Errore', {
              timeOut: 5000,
            });
          }
        );
    }

    this.denotesArray.removeAt(index);

    this.memoryDenotes.splice(index, 1);
  }

  // Rimuove l'associazione tra una voce lessicale e un'entità che la evoca.
  removeEvokes(index) {
    // Abilita la possibilità di aggiungere nuove associazioni di evocazioni.
    this.disableAddEvokes = false;
    // Ottiene l'array delle associazioni di evocazioni dal form.
    this.evokesArray = this.coreForm.get('evokes') as FormArray;

    // Ottiene l'entità associata all'indice specificato.
    const entity = this.evokesArray.at(index).get('entity').value;

    // Ottiene l'ID lessicale dell'oggetto corrente.
    let lexId = this.object.lexicalEntry;

    // Parametri per la richiesta di eliminazione dell'associazione.
    let parameters = {
      relation: 'http://www.w3.org/ns/lemon/ontolex#evokes',
      value: entity,
    };

    // Verifica che l'entità non sia vuota.
    if (entity != '') {
      // Effettua la chiamata al servizio per eliminare l'associazione di evocazione.
      this.lexicalService
        .deleteLinguisticRelation(lexId, parameters)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            // Gestisce la risposta positiva.
            console.log(data);
            this.lexicalService.updateCoreCard(this.object);
            this.toastr.success('Evocazione rimossa', '', {
              timeOut: 5000,
            });
          },
          (error) => {
            // Gestisce eventuali errori durante la richiesta.
            console.log(error);
            if (error.status == 200) {
              this.toastr.success('Evocazione eliminata correttamente', '', {
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

    // Rimuove l'elemento dall'array delle evocazioni.
    this.evokesArray.removeAt(index);

    // Rimuove l'elemento dall'array della memoria delle denotazioni.
    this.memoryDenotes.splice(index, 1);
  }

  // Rimuove l'associazione tra una voce lessicale e un cognato.
  removeCognates(index) {
    // Ottiene l'array delle associazioni di cognati dal form.
    this.cognatesArray = this.coreForm.get('cognates') as FormArray;

    // Ottiene l'entità associata all'indice specificato.
    const entity = this.cognatesArray.at(index).get('entity').value;

    // Ottiene l'ID lessicale dell'oggetto corrente.
    let lexId = this.object.lexicalEntry;

    // Parametri per la richiesta di eliminazione dell'associazione.
    let parameters = {
      relation: 'http://lari-datasets.ilc.cnr.it/lemonEty#cognate',
      value: entity,
    };

    // Verifica che l'entità non sia vuota.
    if (entity != '') {
      // Effettua la chiamata al servizio per eliminare l'associazione di cognate.
      this.lexicalService
        .deleteLinguisticRelation(lexId, parameters)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            // Gestisce la risposta positiva.
            console.log(data);
            this.lexicalService.updateCoreCard(this.object);
            this.toastr.success('Cognato eliminato correttamente', '', {
              timeOut: 5000,
            });
          },
          (error) => {
            // Gestisce eventuali errori durante la richiesta.
            console.log(error);
            if (error.status == 200) {
              this.toastr.success('Cognato rimosso correttamente', '', {
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

    // Abilita la possibilità di aggiungere nuove associazioni di cognati.
    this.disableAddCognates = false;
    // Rimuove l'elemento dall'array dei cognati.
    this.cognatesArray.removeAt(index);

    // Rimuove l'elemento dall'array della memoria dei cognati.
    this.memoryCognates.splice(index, 1);
  }

  // Imposta il tipo dell'entità lessicale come 'Etymon' o 'LexicalEntry' e aggiorna il corrispondente valore nel form.
  isEtymon(boolean: boolean) {
    setTimeout(() => {
      //@ts-ignore
      $('.type-tooltip').tooltip({
        trigger: 'hover',
      });
    }, 700);

    this.lexicalService.spinnerAction('on');
    let lexId = this.object.lexicalEntry;
    let value = '';
    if (boolean) {
      // Imposta l'entità come 'Etymon' e disabilita la modifica del tipo.
      value = 'http://lari-datasets.ilc.cnr.it/lemonEty#Etymon';
      this.coreForm.get('type').setValue('Etymon', { emitEvent: false });
      this.coreForm.get('type').disable({ onlySelf: true, emitEvent: false });
      if (typeof (this.object.type != 'string')) {
        this.object.type.push('Etymon');
      } else {
        this.object.type = 'Etymon';
      }
    } else {
      // Imposta l'entità come 'LexicalEntry' e abilita la modifica del tipo.
      value = 'http://www.w3.org/ns/lemon/ontolex#LexicalEntry';
      this.coreForm.get('type').setValue('LexicalEntry', { emitEvent: false });
      this.coreForm.get('type').enable({ onlySelf: true, emitEvent: false });
      if (typeof (this.object.type != 'string')) {
        this.object.type.splice(this.object.type.indexOf('Etymon'), 1);
        if (this.object.type.length == 0) {
          this.object.type.push(value);
        }
      } else {
        this.object.type = 'LexicalEntry';
      }
    }

    // Parametri per l'aggiornamento del tipo dell'entità lessicale.
    let parameters = {
      relation: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
      value: value,
    };

    // Effettua la chiamata al servizio per aggiornare il tipo dell'entità lessicale.
    this.lexicalService
      .updateLexicalEntry(lexId, parameters)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (data) => {
          // Gestisce la risposta positiva.
          console.log(data);
          this.lexicalService.spinnerAction('off');
          this.lexicalService.updateCoreCard(data);
          this.lexicalService.refreshFilter({ request: true });

          this.lexicalService.triggerSameAs(this.object.type);
        },
        (error) => {
          // Gestisce eventuali errori durante la richiesta.
          console.log(error);
          const data = this.object;
          this.lexicalService.spinnerAction('off');

          if (error.status == '200') {
            this.lexicalService.refreshFilter({ request: true });
            this.lexicalService.updateCoreCard({
              lastUpdate: error.error.text,
            });

            this.toastr.success('Voce lessicale aggiornata', '', {
              timeOut: 5000,
            });
            this.lexicalService.triggerSameAs(this.object.type);
          } else {
            this.toastr.error(error.error, '', { timeOut: 5000 });
          }
        }
      );
  }

  // Carica i dati del cognato e visualizza il pannello corrispondente.
  loadCognateData(cognateInstanceName, lexInstanceName, label) {
    let panel = this.lexicalService.getPanelCognate(
      cognateInstanceName,
      lexInstanceName
    );
    if (panel == undefined) {
      // Effettua la chiamata al servizio per ottenere i dati del cognato.
      this.lexicalService
        .getLexEntryData(cognateInstanceName)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            // Gestisce la risposta positiva.
            console.log(data);
            if (data != undefined) {
              // Crea e visualizza il pannello del cognato.
              this.lexicalService.newPanelForm(
                cognateInstanceName,
                lexInstanceName
              );
              const factory = this.factory.resolveComponentFactory(
                CognatePanelComponent
              );
              const componentRef = this.vc.createComponent(factory);
              this.arrayComponents.push(componentRef);
              (<CognatePanelComponent>componentRef.instance).label = label;
              (<CognatePanelComponent>componentRef.instance).lexicalEntryId =
                lexInstanceName;
              (<CognatePanelComponent>componentRef.instance).cogInstanceName =
                cognateInstanceName;
              (<CognatePanelComponent>componentRef.instance).lexicalEntryData =
                data;
              (<CognatePanelComponent>(
                componentRef.instance
              )).triggerCognatePanel();
            }
          },
          (error) => {
            // Gestisce eventuali errori durante la richiesta.
            console.log(error);
          }
        );
    } else {
      // Il pannello esiste già.
    }
  }

  // Rimuove l'associazione tra una voce lessicale e un subtermine.
  async removeSubterm(index) {
    if (this.object.lexicalEntry != undefined) {
      // Ottiene l'array degli subterm dal form.
      this.subtermArray = this.coreForm.get('subterm') as FormArray;

      // Ottiene l'entità associata all'indice specificato.
      let entity = this.subtermArray.at(index).get('entity').value;
      let lexId = this.object.lexicalEntry;

      // Parametri per la richiesta di eliminazione dell'associazione.
      let parameters = {
        relation: 'http://www.w3.org/ns/lemon/decomp#subterm',
        value: entity,
      };

      // Verifica che l'entità non sia vuota.
      if (entity != '') {
        try {
          // Effettua la chiamata al servizio per eliminare l'associazione di subterm.
          let delete_linguistic_rel_req = await this.lexicalService
            .deleteLinguisticRelation(lexId, parameters)
            .toPromise();
          console.log(delete_linguistic_rel_req);
          this.toastr.info('Subterm rimosso correttamente', 'Info', {
            timeOut: 5000,
          });
          // Aggiorna la richiesta di eliminazione.
          this.lexicalService.deleteRequest({
            subterm: entity,
            parentNode: this.object.lexicalEntry,
          });
        } catch (error) {
          // Gestisce eventuali errori durante la richiesta.
          console.log(error);
          if (error.status == 200) {
            this.toastr.info('Subterm rimosso correttamente', 'Info', {
              timeOut: 5000,
            });
            // Aggiorna la richiesta di eliminazione.
            this.lexicalService.deleteRequest({
              subterm: entity,
              parentNode: this.object.lexicalEntry,
            });
          } else {
            this.toastr.error(
              'Si è verificato un errore, si prega di controllare il log',
              'Errore',
              { timeOut: 5000 }
            );
          }
        }
      } else {
        // L'entità è nulla.
      }
    }

    // Rimuove l'elemento dall'array degli subterm.
    this.subtermArray.removeAt(index);
    // Rimuove l'elemento dall'array della memoria degli subterm.
    this.memorySubterm.splice(index, 1);
    // Abilita la possibilità di aggiungere nuovi subterm.
    this.disableAddSubterm = false;
  }

  // Esegue le operazioni di pulizia e deallocazione delle risorse quando il componente viene distrutto.
  ngOnDestroy(): void {
    this.denotes_subject_subscription.unsubscribe();
    this.cognates_subject_subscription.unsubscribe();
    this.update_lang_subscription.unsubscribe();
    this.get_languages_subscription.unsubscribe();
    this.subject_subscription.unsubscribe();
    this.subterm_subject.unsubscribe();
    this.destroy$.next(true);
    this.destroy$.complete();
  }
}
