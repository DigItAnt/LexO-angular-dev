/*
  © Copyright 2021-2022  Istituto di Linguistica Computazionale "A. Zampolli", Consiglio Nazionale delle Ricerche, Pisa, Italy.
 
This file is part of EpiLexo.

EpiLexo is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

EpiLexo is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with EpiLexo. If not, see <https://www.gnu.org/licenses/>.
*/

import {
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  Renderer2,
  ViewChild,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectComponent } from '@ng-select/ng-select';
import { data } from 'jquery';
import { ToastrService } from 'ngx-toastr';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { AnnotatorService } from 'src/app/services/annotator/annotator.service';
import { AuthService } from 'src/app/services/auth/auth.service';
import { DocumentSystemService } from 'src/app/services/document-system/document-system.service';
import { ExpanderService } from 'src/app/services/expander/expander.service';
import { LexicalEntriesService } from 'src/app/services/lexical-entries/lexical-entries.service';

@Component({
  selector: 'app-search-form',
  templateUrl: './search-form.component.html',
  styleUrls: ['./search-form.component.scss'],
})
export class SearchFormComponent implements OnInit, OnDestroy {
  private search_subject: Subject<any> = new Subject();
  private search_lex_entries_subject: Subject<any> = new Subject();
  searchResults: any[];
  lex_searchResuts: any[];
  languages = [];
  morphologyData = [];
  lexEntryTypesData: any;
  typesData: any;
  addTagFormText: any;
  creator: any;

  search_subscription: Subscription;
  get_languages_subscription: Subscription;
  get_morphology_subscription: Subscription;
  get_lex_entry_type_subscription: Subscription;
  get_form_type_subscription: Subscription;

  constructor(
    private formBuilder: FormBuilder,
    private modalService: NgbModal,
    private toastr: ToastrService,
    private annotatorService: AnnotatorService,
    private lexicalService: LexicalEntriesService,
    private expander: ExpanderService,
    private renderer: Renderer2,
    private auth: AuthService,
    private documentService: DocumentSystemService
  ) {}

  @Input() bind;
  @ViewChild('addFormModal') addFormModal: any;
  @ViewChild('select_form') select_form: NgSelectComponent;
  @ViewChild('search_lexicalEntry') search_lexicalEntry: NgSelectComponent;
  @ViewChild('leidenFake') leidenFake: any;

  loader = false;
  modalStep = 0;

  stepOneForm = new FormGroup({
    existOrNot: new FormControl('', Validators.required),
  });

  stepTwoForm = new FormGroup({
    lexicalEntry: new FormControl('', Validators.required),
  });

  stepThreeForm = new FormGroup({
    label: new FormControl('', Validators.required),
    type: new FormControl('', Validators.required),
    language: new FormControl('', Validators.required),
    pos: new FormControl('', Validators.required),
  });

  stepFourForm = new FormGroup({
    writtenForm: new FormControl('', Validators.required),
    type: new FormControl('', Validators.required),
  });

  statusForm = new FormGroup({
    lexicalEntryCreation: new FormControl(''),
    attachingLanguage: new FormControl(''),
    attachingType: new FormControl(''),
    attachingLabel: new FormControl(''),
    attachingPos: new FormControl(''),
    creatingForm: new FormControl(''),
    attachingWrittenForm: new FormControl(''),
    attachingFormType: new FormControl(''),
    finish: new FormControl(''),
    error: new FormControl(null),
  });

  destroy$: Subject<boolean> = new Subject();

  /**
   * Metodo chiamato quando il componente è inizializzato.
   */
  ngOnInit(): void {
    setTimeout(() => {
      //console.log(this.select_form);
    }, 1000);

    // Verifica se c'è un utente loggato e imposta il creatore del documento
    if (this.auth.getLoggedUser()['preferred_username'] != undefined) {
      this.creator = this.auth.getLoggedUser()['preferred_username'];
    }

    // Sottoscrizione all'evento di ricerca per le voci lessicali
    this.search_lex_entries_subject
      .pipe(debounceTime(3000))
      .subscribe((data) => {
        this.onSearchLexicalEntriesFilter(data);
      });

    // Sottoscrizione all'evento di ricerca generale
    this.search_subject
      .pipe(debounceTime(3000), takeUntil(this.destroy$))
      .subscribe((data) => {
        this.onSearchFilter(data);
      });

    // Recupera le lingue dal servizio
    this.get_languages_subscription = this.lexicalService
      .getLexiconLanguages()
      .subscribe((data) => {
        this.languages = [];
        for (var i = 0; i < data.length; i++) {
          this.languages[i] = data[i];
        }
      });

    // Recupera i dati sulla morfologia dal servizio
    this.get_morphology_subscription = this.lexicalService
      .getMorphologyData()
      .subscribe((data) => {
        let morphoData = data;

        // Filtra i dati sulla morfologia per ottenere solo le parti del discorso
        this.morphologyData = morphoData.filter((x: any) => {
          if (
            x.propertyId ==
            'http://www.lexinfo.net/ontology/3.0/lexinfo#partOfSpeech'
          ) {
            return true;
          } else {
            return false;
          }
        });

        // Estrae i valori delle parti del discorso
        this.morphologyData = this.morphologyData[0]['propertyValues'];
      });

    // Recupera i tipi di voci lessicali dal servizio
    this.get_lex_entry_type_subscription = this.lexicalService
      .getLexEntryTypes()
      .subscribe((data) => {
        this.lexEntryTypesData = data;
      });

    // Recupera i tipi di forma dal servizio
    this.get_form_type_subscription = this.lexicalService
      .getFormTypes()
      .subscribe(
        (data) => {
          this.typesData = data;
        },
        (error) => {
          // Gestisce eventuali errori
        }
      );

    // Sottoscrizione all'evento di ricerca dell'annotatore
    this.annotatorService.triggerSearch$
      .subscribe(
        (request) => {
          console.log(request);
          if (request != null) {
            this.bindSelection(request);
          }
        },
        (error) => {
          // Gestisce eventuali errori
        }
      )
      .unsubscribe();

    // Inizializza i form per ciascuno dei passaggi del processo di creazione
    this.stepOneForm = this.formBuilder.group({
      existOrNot: ['', Validators.required],
    });

    this.stepTwoForm = this.formBuilder.group({
      lexicalEntry: ['', Validators.required],
    });

    this.stepThreeForm = this.formBuilder.group({
      label: ['', Validators.required],
      type: ['', Validators.required],
      language: ['', Validators.required],
      pos: ['', Validators.required],
    });

    this.stepFourForm = this.formBuilder.group({
      writtenForm: ['', Validators.required],
      type: ['', Validators.required],
    });

    // Inizializza il form per lo stato del processo di creazione
    this.statusForm = this.formBuilder.group({
      lexicalEntryCreation: ['pause'],
      attachingLanguage: ['pause'],
      attachingType: ['pause'],
      attachingLabel: ['pause'],
      attachingPos: ['pause'],
      creatingForm: ['pause'],
      attachingWrittenForm: ['pause'],
      attachingFormType: ['pause'],
      finish: ['pause'],
      error: [null],
    });
  }

  /**
   * Questa funzione è chiamata quando si attiva l'evento di ricerca.
   * Controlla se l'evento ha un target definito e se il tasto premuto non è 'Control'.
   * Se entrambe le condizioni sono soddisfatte, invia il valore del target alla subject 'search_subject'.
   * @param evt L'evento di input che ha innescato la ricerca.
   */
  triggerSearch(evt) {
    if (evt.target != undefined && evt.key != 'Control') {
      this.search_subject.next(evt.target.value);
    }
  }

  /**
   * Questa funzione è chiamata quando si attiva l'evento di ricerca per le voci lessicali.
   * Controlla se l'evento ha un target definito e se il tasto premuto non è 'Control'.
   * Se entrambe le condizioni sono soddisfatte, invia il valore del target alla subject 'search_lex_entries_subject'.
   * @param evt L'evento di input che ha innescato la ricerca per le voci lessicali.
   */
  triggerSearchLexicalEntries(evt) {
    if (evt.target != undefined && evt.key != 'Control') {
      this.search_lex_entries_subject.next(evt.target.value);
    }
  }

  /**
   * Questa funzione gestisce la ricerca dei risultati in base ai filtri specificati.
   * Pulisce l'array 'searchResults', imposta i parametri di ricerca e richiama il servizio di ricerca di formule.
   * Se la ricerca ha successo, popola l'array 'searchResults' con i risultati ottenuti.
   * @param data I dati di ricerca forniti dall'utente.
   */
  async onSearchFilter(data) {
    this.searchResults = [];
    let parameters = {
      text: data,
      searchMode: 'startsWith',
      representationType: 'writtenRep',
      author: '',
      offset: 0,
      limit: 500,
    };
    console.log(parameters);
    if (data != undefined) {
      /* && data.length >= 3 */
      try {
        let form_list = await this.lexicalService
          .getFormList(parameters)
          .toPromise();
        this.searchResults = form_list['list'];
        this.loader = false;
      } catch (error) {
        console.log(error);
        this.loader = false;
      }
    }
  }

  /**
   * Questa funzione gestisce la ricerca delle voci lessicali in base ai filtri specificati.
   * Pulisce l'array 'searchResults', imposta i parametri di ricerca e richiama il servizio di ricerca delle voci lessicali.
   * Se la ricerca ha successo, popola l'array 'lex_searchResuts' con i risultati ottenuti.
   * @param data I dati di ricerca forniti dall'utente.
   */
  async onSearchLexicalEntriesFilter(data) {
    this.searchResults = [];
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
    console.log(parameters);
    if (data != '') {
      /* && data.length >= 3 */
      try {
        let lex_list = await this.lexicalService
          .getLexicalEntriesList(parameters)
          .toPromise();
        this.lex_searchResuts = lex_list['list'];
        this.loader = false;
      } catch (error) {
        console.log(error);
      }
    }
  }

  /**
   * Questa funzione pulisce tutti i filtri e i risultati della ricerca per le formule.
   */
  clearAll() {
    this.select_form.handleClearClick();
  }

  /**
   * Questa funzione pulisce tutti i filtri e i risultati della ricerca per le voci lessicali.
   */
  clearAllLexicalEntries() {
    this.search_lexicalEntry.handleClearClick();
  }

  /**
   * Questa funzione gestisce il bind della selezione.
   * Imposta il loader su 'true', attua un ritardo di 100 millisecondi per permettere il completamento delle operazioni
   * e poi chiama i metodi per filtrare la selezione e avviare la ricerca.
   * @param req I dati necessari per filtrare la selezione.
   */
  bindSelection(req) {
    this.loader = true;
    setTimeout(() => {
      this.select_form.filter(req);
      this.onSearchFilter(req);
    }, 100);
  }

  /**
   * Gestisce l'evento di invio del form.
   * Se l'elemento ngSelect è un'istanza di NgSelectComponent e ha almeno un elemento selezionato,
   * ottiene l'etichetta dell'elemento selezionato e chiama la funzione onChangeForm con il valore selezionato.
   * @param ngSelect Elemento ngSelect che ha innescato l'evento.
   * @param $event Evento che ha innescato la chiamata della funzione.
   */
  handleForm(ngSelect, $event) {
    // Verifica se ngSelect è un'istanza di NgSelectComponent
    if (ngSelect instanceof NgSelectComponent) {
      // Verifica se ci sono elementi selezionati in ngSelect
      if (ngSelect.selectedItems.length > 0) {
        // Ottiene l'etichetta dell'elemento selezionato
        let label;
        if (ngSelect.selectedItems[0]['value']['form'] != undefined) {
          label = ngSelect.selectedItems[0]['value']['form'];
        } else {
          label = ngSelect.selectedItems[0].label;
        }
        // Chiama la funzione onChangeForm con il valore selezionato
        this.onChangeForm(ngSelect.selectedItems[0]['value']);
      }
    }
  }

  /**
   * Gestisce l'evento di modifica del formulario.
   * @param data Oggetto che contiene i dati del formulario.
   */
  async onChangeForm(data) {
    // Inizializzazione delle variabili
    let parameters = {};
    let idPopover = this.bind.selectedPopover.tokenId;
    let tokenData = this.bind.object[idPopover];
    let element_id = this.bind.epiData.element_id;
    let textSelection = this.bind.message;
    let selectionSpan = this.bind.spanSelection;
    let formValue = data.form;

    let leidenToken = '';

    // Verifica se sono presenti informazioni sul token e se esiste un identificatore XML
    if (tokenData != undefined && tokenData.xmlid != null) {
      let xmlNode = this.bind.epiData.xmlDoc.querySelectorAll(
        "[*|id='" + tokenData.xmlid + "']"
      )[0].outerHTML;
      let object = {
        xmlString: xmlNode,
      };

      // Richiesta di conversione in formato Leiden
      try {
        let convert_to_leiden = await this.documentService
          .testConvertItAnt(object)
          .toPromise();
        let raw = convert_to_leiden['xml'];
        let bodyResponse = new DOMParser().parseFromString(
          raw,
          'text/html'
        ).body;

        bodyResponse.childNodes.forEach((x) => {
          if (x.nodeName != undefined) {
            if (x.nodeName == '#text') {
              leidenToken += x.nodeValue.replace('\n', '');
            }
          }
        });
      } catch (error) {
        // Gestione dell'errore in caso di fallimento della conversione
        this.toastr.error(
          'Errore durante la conversione del testo in Leiden',
          'Errore',
          {
            timeOut: 5000,
          }
        );
      }
    }

    let lexEntryLabel = '';

    // Recupera le informazioni sull'etichetta dell'entry lessicale
    try {
      let lexEntryData = await this.lexicalService
        .getLexEntryData(data.lexicalEntry)
        .toPromise();
      if (lexEntryData) lexEntryLabel = lexEntryData.label;
    } catch (error) {
      console.log(error);
    }

    // Inizializzazione del creatore, se non definito
    if (this.creator == undefined) {
      this.creator = '';
    }

    // Costruzione dei parametri per l'annotazione
    if (textSelection != '' && textSelection != undefined) {
      parameters['value'] = formValue;
      parameters['layer'] = 'attestation';
      parameters['attributes'] = {
        author: this.creator,
        creator: this.creator,
        note: '',
        confidence: 1,
        timestamp: new Date().getTime().toString(),
        bibliography: [],
        validity: '',
        externalRef: '',
        leiden: leidenToken != '' ? leidenToken : null,
        node_id: tokenData.id,
        label: data.label,
        lexicalEntry: data.lexicalEntry,
        lexicalEntryLabel: lexEntryLabel,
      };
      parameters['spans'] = [
        {
          start: selectionSpan.start.toString(),
          end: selectionSpan.end.toString(),
        },
      ];
      parameters['id'] = tokenData.node;
    } else if (
      textSelection == '' &&
      !Array.isArray(selectionSpan) &&
      !this.bind.isEmptyFile
    ) {
      parameters['value'] = formValue;
      parameters['layer'] = 'attestation';
      parameters['attributes'] = {
        author: this.creator,
        creator: this.creator,
        note: '',
        confidence: 1,
        timestamp: new Date().getTime().toString(),
        bibliography: [],
        leiden: leidenToken,
        validity: '',
        externalRef: '',
        node_id: tokenData.id,
        label: data.label,
        lexicalEntry: data.lexicalEntry,
        lexicalEntryLabel: lexEntryLabel,
      };
      parameters['spans'] = [
        {
          start: tokenData.begin.toString(),
          end: tokenData.end.toString(),
        },
      ];
      parameters['id'] = tokenData.node;
    } else if (Array.isArray(selectionSpan)) {
      //MULTIWORD
      parameters['value'] = formValue;
      parameters['layer'] = 'attestation';
      parameters['attributes'] = {
        author: this.creator,
        creator: this.creator,
        note: '',
        confidence: 1,
        timestamp: new Date().getTime().toString(),
        bibliography: [],
        validity: '',
        externalRef: '',
        leiden: leidenToken,
        node_id: tokenData.id,
        label: data.label,
        lexicalEntry: data.lexicalEntry,
        lexicalEntryLabel: lexEntryLabel,
      };
      parameters['spans'] = selectionSpan;
      parameters['id'] = tokenData.node;
    } else if (this.bind.isEmptyFile) {
      let leidenFake = this.leidenFake.nativeElement.value;
      let checkUnstructured;

      try {
        checkUnstructured = await this.annotatorService
          .getText(element_id)
          .toPromise();
      } catch (error) {}

      let createUnstructured;

      if (checkUnstructured.text) {
      } else {
        let body = {
          unstructured: {
            fake: ' ',
          },
          'element-id': element_id,
        };

        try {
          createUnstructured = await this.annotatorService
            .addUnstructured(element_id, body)
            .toPromise();
        } catch (error) {
          console.log(error);
        }
      }

      const min = 1000000; // 1 miliardo (10 cifre)
      const max = 9999999; // 9,999,999,999 (10 cifre)

      let fakeToken = {
        text: leidenFake,
        xmlid: null,
        position: 0,
        begin: 0,
        end: 0,
        node: 0,
        source: 'fake',
        imported: false,
        id: Math.floor(Math.random() * (max - min + 1)) + min,
      };

      let addAnnoReq;

      try {
        addAnnoReq = await this.annotatorService
          .addToken(element_id, fakeToken)
          .toPromise();

        if (addAnnoReq) {
          this.annotatorService.addTokenToEpigraphyForm(addAnnoReq.token);
        }
      } catch (e) {
        console.log(e);
      }

      parameters['value'] = formValue;
      parameters['layer'] = 'attestation';
      parameters['attributes'] = {
        author: this.creator,
        creator: this.creator,
        note: '',
        confidence: 1,
        timestamp: new Date().getTime().toString(),
        bibliography: [],
        validity: '',
        leiden: leidenFake,
        externalRef: '',
        node_id: undefined,
        token_id: addAnnoReq.token.id,
        label: data.label,
        lexicalEntry: data.lexicalEntry,
        lexicalEntryLabel: lexEntryLabel,
      };
      parameters['spans'] = [
        {
          start: 0,
          end: 1,
        },
      ];
      parameters['id'] = element_id;
    }

    console.log(parameters);

    let identifier;

    // Determina l'identificatore da utilizzare in base alla presenza di un file o meno
    if (!this.bind.isEmptyFile) {
      identifier = tokenData.node;
    } else {
      identifier = element_id;
    }

    try {
      // Aggiunta dell'annotazione
      let add_annotation_request = await this.annotatorService
        .addAnnotation(parameters, identifier)
        .toPromise();
      console.log(data);
      this.bind.annotationArray.push(add_annotation_request.annotation);

      if (!this.bind.isEmptyFile) {
        this.bind.populateLocalAnnotation(tokenData);
      } else {
        this.bind.populateLocalAnnotation(add_annotation_request.annotation);
      }

      if (!this.bind.isEmptyFile) {
        // Aggiunge la classe 'annotation' agli elementi HTML corrispondenti
        this.bind.object.forEach((element) => {
          if (
            add_annotation_request.annotation.attributes.node_id == element.id
          ) {
            let positionElement = element.position;
            let elementHTML = document.getElementsByClassName(
              'token-' + (positionElement - 1)
            )[0];
            this.renderer.addClass(elementHTML, 'annotation');
          }
        });
      }

      // Messaggio di successo
      this.toastr.success('Nuova attestazione creata', 'Informazione', {
        timeOut: 5000,
      });
    } catch (error) {
      // Gestione dell'errore in caso di fallimento dell'aggiunta dell'annotazione
      if (error.status != 200) {
        this.toastr.error(
          'Errore durante la creazione della nuova attestazione',
          'Errore',
          {
            timeOut: 5000,
          }
        );
      }
    }
  }

  /**
   * Aggiunge un nuovo form e apre una modale per il form specificato.
   *
   * @param form Il form da aggiungere.
   */
  addNewForm = (form: string) => {
    // Imposta il testo del form da aggiungere
    this.addTagFormText = form;

    // Ottiene l'indice della popover selezionata
    let index = this.bind.selectedPopover.tokenId;
    // Ottiene la popover corrispondente all'indice
    let popover = this.bind.spanPopovers.toArray()[index];

    // Chiude la popover se è aperta
    if (popover != undefined) {
      if (popover.isOpen()) {
        popover.close();
      }
    }

    // Apre la modale per il nuovo form
    this.modalService.open(this.addFormModal, {
      size: 'lg',
      windowClass: 'dark-modal',
      beforeDismiss: () => {
        // Controlla se ci sono modifiche non salvate prima di chiudere la modale
        if (
          this.stepOneForm.touched ||
          this.stepTwoForm.touched ||
          this.stepThreeForm.touched ||
          this.stepFourForm.touched
        ) {
          if (
            !confirm(
              'Ci sono modifiche non salvate. Vuoi davvero uscire senza salvare?'
            )
          ) {
            return false;
          } else {
            // Resetta tutti i form e li contrassegna come non toccati e non modificati
            this.resetAndMarkAsUntouched();
            return true;
          }
        } else {
          // Se non ci sono modifiche non salvate, resetta i form e li contrassegna come non toccati e non modificati
          this.resetAndMarkAsUntouched();
          return true;
        }
      },
    });

    // Imposta il passo iniziale della modale
    this.modalStep = 1;
  };

  /**
   * Passa al passo successivo della modale.
   */
  nextStep() {
    if (this.modalStep == 1) {
      // Se siamo al passo 1 e il form indica che è un nuovo elemento, passa direttamente al passo 3, altrimenti al passo 2
      this.modalStep =
        this.stepOneForm.get('existOrNot').value == 'new' ? 3 : 2;

      // Resetta e contrassegna come non toccati e non modificati il form del passo 2 e svuota il contenuto aggiuntivo
      this.resetStepTwoForm();

      // Resetta e contrassegna come non toccati e non modificati il form del passo 3
      this.resetStepThreeForm();

      // Resetta e contrassegna come non toccati e non modificati il form del passo 4
      this.resetStepFourForm();
    } else if (this.modalStep == 3) {
      // Se siamo al passo 3, passa direttamente al passo 4
      this.modalStep += 1;

      // Resetta e contrassegna come non toccati e non modificati il form del passo 2 e svuota il contenuto aggiuntivo
      this.resetStepTwoForm();

      // Resetta e contrassegna come non toccati e non modificati il form del passo 4
      this.resetStepFourForm();

      // Imposta il testo aggiunto al form del passo 4
      this.stepFourForm
        .get('writtenForm')
        .patchValue(this.addTagFormText, { emitEvent: false });
    } else if (this.modalStep == 2) {
      // Se siamo al passo 2, passa direttamente al passo 4
      this.modalStep = 4;

      // Resetta e contrassegna come non toccati e non modificati il form del passo 3
      this.resetStepThreeForm();

      // Resetta e contrassegna come non toccati e non modificati il form del passo 4
      this.resetStepFourForm();

      // Imposta il testo aggiunto al form del passo 4
      this.stepFourForm
        .get('writtenForm')
        .patchValue(this.addTagFormText, { emitEvent: false });
    } else {
      // Incrementa il passo successivo
      this.modalStep += 1;

      // Chiama la funzione di factory se siamo al passo 6
      if (this.modalStep == 6) {
        this.wizardFactory();
      }

      // Imposta il passo massimo a 6
      if (this.modalStep > 6) {
        this.modalStep = 6;
      }
    }
  }

  /**
   * Torna al passo precedente della modale.
   */
  previousStep() {
    if (this.modalStep == 2) {
      // Se siamo al passo 2, torna al passo 1
      this.modalStep -= 1;
    } else if (this.modalStep == 3) {
      // Se siamo al passo 3, torna al passo 1
      this.modalStep = 1;
    } else if (this.modalStep == 4) {
      // Se siamo al passo 4, controlla se il form del passo 3 è stato toccato, altrimenti torna al passo 2
      if (this.stepThreeForm.touched) {
        this.modalStep = 3;
      } else if (this.stepTwoForm.touched) {
        this.modalStep = 2;
      }
    } else if (this.modalStep == 5) {
      // Se siamo al passo 5, torna al passo 4
      this.modalStep -= 1;
    }
  }

  // Funzione ausiliaria per resettare e contrassegnare come non toccati e non modificati tutti i form
  private resetAndMarkAsUntouched() {
    this.resetStepOneForm();
    this.resetStepTwoForm();
    this.resetStepThreeForm();
    this.resetStepFourForm();
  }

  // Funzione ausiliaria per resettare e contrassegnare come non toccato e non modificato il form del passo 1
  private resetStepOneForm() {
    this.stepOneForm.reset();
    this.stepOneForm.markAsUntouched();
    this.stepOneForm.markAsPristine();
  }

  // Funzione ausiliaria per resettare e contrassegnare come non toccato e non modificato il form del passo 2
  private resetStepTwoForm() {
    this.stepTwoForm.reset();
    this.stepTwoForm.markAsUntouched();
    this.stepTwoForm.markAsPristine();
    this.clearAll(); // Svuota il contenuto aggiuntivo
  }

  // Funzione ausiliaria per resettare e contrassegnare come non toccato e non modificato il form del passo 3
  private resetStepThreeForm() {
    this.stepThreeForm.reset();
    this.stepThreeForm.markAsUntouched();
    this.stepThreeForm.markAsPristine();
  }

  // Funzione ausiliaria per resettare e contrassegnare come non toccato e non modificato il form del passo 4
  private resetStepFourForm() {
    this.stepFourForm.reset();
    this.stepFourForm.markAsUntouched();
    this.stepFourForm.markAsPristine();
  }

  async wizardFactory() {
    //nuova lexical entry
    if (this.stepThreeForm.touched) {
      // Imposta lo stato della creazione della voce lessicale su "in sospeso"
      this.statusForm
        .get('lexicalEntryCreation')
        .patchValue('pending', { emitEvent: false });

      try {
        // Effettua una richiesta per creare una nuova voce lessicale
        let new_lex_entry_request = await this.lexicalService
          .newLexicalEntry()
          .toPromise();

        // Se la richiesta di creazione della voce lessicale ha successo
        if (new_lex_entry_request) {
          // Imposta lo stato della creazione della voce lessicale su "ok"
          this.statusForm
            .get('lexicalEntryCreation')
            .patchValue('ok', { emitEvent: false });
          // Imposta lo stato dell'aggiunta della lingua su "in sospeso"
          this.statusForm
            .get('attachingLanguage')
            .patchValue('pending', { emitEvent: false });

          // Ottieni l'ID della nuova voce lessicale creata
          let lexId = new_lex_entry_request['lexicalEntry'];
          let lang = this.stepThreeForm.get('language').value;
          let parameters = {
            relation: 'http://www.w3.org/ns/lemon/lime#entry',
            value: lang,
          };

          try {
            // Aggiorna la voce lessicale con la lingua associata
            let update_lang_new_lex_request = await this.lexicalService
              .updateLexicalEntry(lexId, parameters)
              .toPromise();
          } catch (error) {
            // Se c'è un errore nell'aggiornamento della lingua associata alla voce lessicale
            if (error.status == 200) {
              // Imposta lo stato dell'aggiunta della lingua su "ok"
              this.statusForm
                .get('attachingLanguage')
                .patchValue('ok', { emitEvent: false });
              // Imposta lo stato dell'aggiunta del tipo su "in sospeso"
              this.statusForm
                .get('attachingType')
                .patchValue('pending', { emitEvent: false });
              let type = this.stepThreeForm.get('type').value;
              let parameters = {
                relation: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
                value: type,
              };

              try {
                // Aggiorna la voce lessicale con il tipo associato
                let attach_type_req = await this.lexicalService
                  .updateLexicalEntry(lexId, parameters)
                  .toPromise();
              } catch (error) {
                // Se c'è un errore nell'aggiornamento del tipo associato alla voce lessicale
                if (error.status == 200) {
                  // Imposta lo stato dell'aggiunta del tipo su "ok"
                  this.statusForm
                    .get('attachingType')
                    .patchValue('ok', { emitEvent: false });

                  // Imposta lo stato dell'aggiunta dell'etichetta su "in sospeso"
                  this.statusForm
                    .get('attachingLabel')
                    .patchValue('pending', { emitEvent: false });
                  // Ottieni l'etichetta dalla form
                  let label = this.stepThreeForm.get('label').value;
                  let parameters = {
                    relation: 'http://www.w3.org/2000/01/rdf-schema#label',
                    value: label,
                  };

                  try {
                    // Aggiorna la voce lessicale con l'etichetta associata
                    let attach_label = await this.lexicalService
                      .updateLexicalEntry(lexId, parameters)
                      .toPromise();
                  } catch (error) {
                    // Se c'è un errore nell'aggiornamento dell'etichetta associata alla voce lessicale
                    if (error.status == 200) {
                      // Imposta lo stato dell'aggiunta dell'etichetta su "ok"
                      this.statusForm
                        .get('attachingLabel')
                        .patchValue('ok', { emitEvent: false });
                      // Imposta lo stato dell'aggiunta del POS (part of speech) su "in sospeso"
                      this.statusForm
                        .get('attachingPos')
                        .patchValue('pending', { emitEvent: false });

                      // Ottieni il POS dalla form
                      let pos = this.stepThreeForm.get('pos').value;
                      let parameters = {
                        type: 'morphology',
                        relation:
                          'http://www.lexinfo.net/ontology/3.0/lexinfo#partOfSpeech',
                        value: pos,
                      };

                      try {
                        // Aggiorna la relazione linguistica associata alla voce lessicale
                        let attach_pos = await this.lexicalService
                          .updateLinguisticRelation(lexId, parameters)
                          .toPromise();
                      } catch (error) {
                        // Se c'è un errore nell'aggiornamento del POS associato alla voce lessicale
                        if (error.status == 200) {
                          // Imposta lo stato dell'aggiunta del POS su "ok"
                          this.statusForm
                            .get('attachingPos')
                            .patchValue('ok', { emitEvent: false });

                          // Imposta lo stato della creazione del modulo su "in sospeso"
                          this.statusForm
                            .get('creatingForm')
                            .patchValue('pending', { emitEvent: false });

                          try {
                            // Crea un nuovo modulo associato alla voce lessicale
                            let create_form = await this.lexicalService
                              .createNewForm(lexId)
                              .toPromise();
                            console.log(create_form);
                            let formId = create_form.form;
                            let formData = create_form;
                            // Imposta lo stato della creazione del modulo su "ok"
                            this.statusForm
                              .get('creatingForm')
                              .patchValue('ok', { emitEvent: false });

                            // Imposta lo stato dell'aggiunta di "writtenRep" al modulo su "in sospeso"
                            this.statusForm
                              .get('attachingWrittenForm')
                              .patchValue('pending', { emitEvent: false });
                            let writtenRep =
                              this.stepFourForm.get('writtenForm').value;
                            let parameters = {
                              relation:
                                'http://www.w3.org/ns/lemon/ontolex#writtenRep',
                              value: writtenRep,
                            };

                            try {
                              // Aggiorna il modulo con "writtenRep"
                              let attach_written_rep = await this.lexicalService
                                .updateForm(formId, parameters)
                                .toPromise();
                            } catch (error) {
                              // Se c'è un errore nell'aggiornamento di "writtenRep" al modulo
                              if (error.status == 200) {
                                // Imposta lo stato dell'aggiunta di "writtenRep" al modulo su "ok"
                                this.statusForm
                                  .get('attachingWrittenForm')
                                  .patchValue('ok', { emitEvent: false });
                                // Imposta lo stato dell'aggiunta del tipo al modulo su "in sospeso"
                                this.statusForm
                                  .get('attachingFormType')
                                  .patchValue('pending', { emitEvent: false });
                                let typeForm =
                                  this.stepFourForm.get('type').value;

                                let parameters = {
                                  relation:
                                    'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
                                  value: typeForm,
                                };

                                try {
                                  // Aggiorna il modulo con il tipo associato
                                  let attach_type_form =
                                    await this.lexicalService
                                      .updateForm(formId, parameters)
                                      .toPromise();
                                  // Imposta lo stato dell'aggiunta del tipo al modulo su "ok"
                                  this.statusForm
                                    .get('attachingFormType')
                                    .patchValue('ok', { emitEvent: false });
                                  // Imposta lo stato di "finish" su "ok"
                                  this.statusForm
                                    .get('finish')
                                    .patchValue('ok', { emitEvent: false });
                                } catch (error) {
                                  // Se c'è un errore nell'aggiornamento del tipo associato al modulo
                                  if (error.status == 200) {
                                    // Imposta lo stato dell'aggiunta del tipo al modulo su "ok"
                                    this.statusForm
                                      .get('attachingFormType')
                                      .patchValue('ok', { emitEvent: false });
                                    // Imposta lo stato di "finish" su "ok"
                                    this.statusForm
                                      .get('finish')
                                      .patchValue('ok', { emitEvent: false });

                                    let parameters = {};
                                    let idPopover =
                                      this.bind.selectedPopover.tokenId;
                                    let tokenData = this.bind.object[idPopover];
                                    let element_id =
                                      this.bind.epiData.element_id;
                                    let textSelection = this.bind.message;
                                    let selectionSpan = this.bind.spanSelection;
                                    let formValue = formId;

                                    let xmlNode =
                                      this.bind.epiData.xmlDoc.querySelectorAll(
                                        "[*|id='" + tokenData.xmlid + "']"
                                      )[0].outerHTML;
                                    let object = {
                                      xmlString: xmlNode,
                                    };
                                    let leidenToken = '';
                                    try {
                                      let convert_to_leiden =
                                        await this.documentService
                                          .testConvertItAnt(object)
                                          .toPromise();
                                      console.log(convert_to_leiden);
                                      let raw = convert_to_leiden['xml'];
                                      let bodyResponse =
                                        new DOMParser().parseFromString(
                                          raw,
                                          'text/html'
                                        ).body;

                                      bodyResponse.childNodes.forEach((x) => {
                                        if (x.nodeName != undefined) {
                                          if (x.nodeName == '#text') {
                                            leidenToken += x.nodeValue.replace(
                                              '\n',
                                              ''
                                            );
                                          }
                                        }
                                      });
                                    } catch (error) {
                                      this.toastr.error(
                                        'Errore nella conversione del testo di Leiden',
                                        'Errore',
                                        {
                                          timeOut: 5000,
                                        }
                                      );
                                    }

                                    if (this.creator == undefined) {
                                      this.creator = '';
                                    }

                                    parameters['value'] = formValue;
                                    parameters['layer'] = 'attestation';
                                    parameters['attributes'] = {
                                      author: this.creator,
                                      creator: this.creator,
                                      note: '',
                                      confidence: 1,
                                      timestamp: new Date()
                                        .getTime()
                                        .toString(),
                                      bibliography: [],
                                      leiden: leidenToken,
                                      validity: '',
                                      externalRef: '',
                                      node_id: tokenData.id,
                                      label: writtenRep,
                                      lexicalEntry: formData.lexicalEntry,
                                    };
                                    parameters['spans'] = [
                                      {
                                        start: tokenData.begin.toString(),
                                        end: tokenData.end.toString(),
                                      },
                                    ];
                                    parameters['id'] = tokenData.node;

                                    let identifier;

                                    if (!this.bind.isEmptyFile) {
                                      identifier = tokenData.node;
                                    } else {
                                      identifier = element_id;
                                    }

                                    try {
                                      // Aggiungi un'annotazione
                                      let add_annotation_request =
                                        await this.annotatorService
                                          .addAnnotation(parameters, identifier)
                                          .toPromise();
                                      console.log(data);
                                      // Aggiungi l'annotazione all'array locale
                                      this.bind.annotationArray.push(
                                        add_annotation_request.annotation
                                      );

                                      // Popola l'annotazione locale
                                      if (!this.bind.isEmptyFile) {
                                        this.bind.populateLocalAnnotation(
                                          tokenData
                                        );
                                      } else {
                                        this.bind.populateLocalAnnotation(
                                          add_annotation_request.annotation
                                        );
                                      }

                                      // Se il file non è vuoto, evidenzia l'annotazione
                                      if (!this.bind.isEmptyFile) {
                                        this.bind.object.forEach((element) => {
                                          if (
                                            add_annotation_request.annotation
                                              .attributes.node_id == element.id
                                          ) {
                                            let positionElement =
                                              element.position;
                                            let elementHTML =
                                              document.getElementsByClassName(
                                                'token-' + (positionElement - 1)
                                              )[0];
                                            this.renderer.addClass(
                                              elementHTML,
                                              'annotation'
                                            );
                                          }
                                        });
                                      }

                                      this.toastr.success(
                                        'Nuova attestazione creata',
                                        'Info',
                                        {
                                          timeOut: 5000,
                                        }
                                      );
                                    } catch (error) {
                                      // Se c'è un errore nell'aggiunta dell'annotazione
                                      if (error.status != 200) {
                                        this.toastr.error(
                                          'Errore nella creazione della nuova attestazione',
                                          'Errore',
                                          {
                                            timeOut: 5000,
                                          }
                                        );
                                      }
                                    }
                                  } else {
                                    this.toastr.error(
                                      "Errore nell'aggiunta del tipo al modulo",
                                      'Errore',
                                      { timeOut: 5000 }
                                    );
                                  }
                                }
                              } else {
                                this.toastr.error(
                                  'Errore nell\'aggiunta di "writtenRep" al modulo',
                                  'Errore',
                                  { timeOut: 5000 }
                                );
                              }
                            }
                          } catch (error) {
                            this.toastr.error(
                              'Errore nella creazione del nuovo modulo',
                              'Errore',
                              { timeOut: 5000 }
                            );
                          }
                        } else {
                          this.toastr.error(
                            "Errore nell'aggiunta del POS (part of speech)",
                            'Errore',
                            {
                              timeOut: 5000,
                            }
                          );
                        }
                      }
                    } else {
                      this.toastr.error(
                        "Errore nell'aggiunta dell'etichetta",
                        'Errore',
                        {
                          timeOut: 5000,
                        }
                      );
                    }
                  }
                } else {
                  this.toastr.error("Errore nell'aggiunta del tipo", 'Errore', {
                    timeOut: 5000,
                  });
                }
              }
            } else {
              this.toastr.error(error.error.message, 'Errore');
            }
          }
        }
      } catch (error) {
        this.toastr.error(
          'Errore nella creazione della voce lessicale',
          'Errore'
        );
      }
    } else if (this.stepTwoForm.touched) {
      // Se il form è stato toccato (modificato)

      let lexId = this.stepTwoForm.get('lexicalEntry').value;
      // Recupera l'identificatore della voce lessicale dal form

      // Imposta lo stato della creazione del form su 'in attesa'
      this.statusForm
        .get('creatingForm')
        .patchValue('pending', { emitEvent: false });

      try {
        // Richiede la creazione di un nuovo form al servizio lessicale in modo sincrono
        let create_new_form = await this.lexicalService
          .createNewForm(lexId)
          .toPromise();
        console.log(create_new_form);

        let formId = create_new_form.form;

        // Imposta lo stato della creazione del form su 'ok'
        this.statusForm
          .get('creatingForm')
          .patchValue('ok', { emitEvent: false });

        // Attacca la forma scritta al form
        this.statusForm
          .get('attachingWrittenForm')
          .patchValue('pending', { emitEvent: false });
        let writtenRep = this.stepFourForm.get('writtenForm').value;
        let parameters = {
          relation: 'http://www.w3.org/ns/lemon/ontolex#writtenRep',
          value: writtenRep,
        };

        try {
          // Aggiorna il form con la forma scritta fornita
          let attach_written_rep = await this.lexicalService
            .updateForm(formId, parameters)
            .toPromise();
        } catch (error) {
          // Se si verifica un errore durante l'aggiornamento del form con la forma scritta
          if (error.status == 200) {
            // Imposta lo stato dell'attacco della forma scritta su 'ok'
            this.statusForm
              .get('attachingWrittenForm')
              .patchValue('ok', { emitEvent: false });
            // Attacca il tipo al form
            this.statusForm
              .get('attachingFormType')
              .patchValue('pending', { emitEvent: false });
            let typeForm = this.stepFourForm.get('type').value;

            let parameters = {
              relation: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
              value: typeForm,
            };

            try {
              // Aggiorna il form con il tipo fornito
              let attach_type = await this.lexicalService
                .updateForm(formId, parameters)
                .toPromise();
              // Imposta lo stato dell'attacco del tipo su 'ok'
              this.statusForm
                .get('attachingFormType')
                .patchValue('ok', { emitEvent: false });
              // Imposta lo stato di completamento su 'ok'
              this.statusForm
                .get('finish')
                .patchValue('ok', { emitEvent: false });
            } catch (error) {
              // Se si verifica un errore durante l'aggiornamento del form con il tipo
              if (error.status == 200) {
                // Imposta lo stato dell'attacco del tipo su 'ok'
                this.statusForm
                  .get('attachingFormType')
                  .patchValue('ok', { emitEvent: false });
                // Imposta lo stato di completamento su 'ok'
                this.statusForm
                  .get('finish')
                  .patchValue('ok', { emitEvent: false });

                let parameters = {};
                let idPopover = this.bind.selectedPopover.tokenId;
                let tokenData = this.bind.object[idPopover];
                let element_id = this.bind.epiData.element_id;
                let textSelection = this.bind.message;
                let selectionSpan = this.bind.spanSelection;
                let formValue = formId;

                let xmlNode = this.bind.epiData.xmlDoc.querySelectorAll(
                  "[*|id='" + tokenData.xmlid + "']"
                )[0].outerHTML;
                let object = {
                  xmlString: xmlNode,
                };
                let leidenToken = '';
                try {
                  let convert_to_leiden = await this.documentService
                    .testConvertItAnt(object)
                    .toPromise();
                  console.log(convert_to_leiden);
                  let raw = convert_to_leiden['xml'];
                  let bodyResponse = new DOMParser().parseFromString(
                    raw,
                    'text/html'
                  ).body;

                  bodyResponse.childNodes.forEach((x) => {
                    if (x.nodeName != undefined) {
                      if (x.nodeName == '#text') {
                        leidenToken += x.nodeValue.replace('\n', '');
                      }
                    }
                  });
                } catch (error) {
                  // Se si verifica un errore durante la conversione del testo di Leiden
                  this.toastr.error(
                    'Errore nella conversione del testo di Leiden',
                    'Errore',
                    {
                      timeOut: 5000,
                    }
                  );
                }

                if (this.creator == undefined) {
                  this.creator = '';
                }

                parameters['value'] = formValue;
                parameters['layer'] = 'attestation';
                parameters['attributes'] = {
                  author: this.creator,
                  creator: this.creator,
                  note: '',
                  confidence: 1,
                  timestamp: new Date().getTime().toString(),
                  bibliography: [],
                  leiden: leidenToken,
                  validity: '',
                  externalRef: '',
                  node_id: tokenData.id,
                  label: writtenRep,
                  lexicalEntry: lexId,
                };
                parameters['spans'] = [
                  {
                    start: tokenData.begin.toString(),
                    end: tokenData.end.toString(),
                  },
                ];
                parameters['id'] = tokenData.node;

                let identifier;

                if (!this.bind.isEmptyFile) {
                  identifier = tokenData.node;
                } else {
                  identifier = element_id;
                }

                try {
                  // Aggiunge un'annotazione al token specificato
                  let add_annotation_request = await this.annotatorService
                    .addAnnotation(parameters, identifier)
                    .toPromise();
                  console.log(data);
                  this.bind.annotationArray.push(
                    add_annotation_request.annotation
                  );

                  if (!this.bind.isEmptyFile) {
                    this.bind.populateLocalAnnotation(tokenData);
                  } else {
                    this.bind.populateLocalAnnotation(
                      add_annotation_request.annotation
                    );
                  }

                  if (!this.bind.isEmptyFile) {
                    this.bind.object.forEach((element) => {
                      if (
                        add_annotation_request.annotation.attributes.node_id ==
                        element.id
                      ) {
                        let positionElement = element.position;
                        let elementHTML = document.getElementsByClassName(
                          'token-' + (positionElement - 1)
                        )[0];
                        this.renderer.addClass(elementHTML, 'annotation');
                      }
                    });
                  }

                  this.toastr.success('Nuova attestazione creata', 'Info', {
                    timeOut: 5000,
                  });
                } catch (error) {
                  // Se si verifica un errore durante la creazione di una nuova annotazione
                  if (error.status != 200) {
                    this.toastr.error(
                      'Errore nella creazione di una nuova attestazione',
                      'Errore',
                      {
                        timeOut: 5000,
                      }
                    );
                  }
                }
              } else {
                // Se si verifica un errore durante l'aggiornamento del form con il tipo
                this.toastr.error("Errore nell'attaccare il tipo", 'Errore', {
                  timeOut: 5000,
                });
              }
            }
          } else {
            // Se si verifica un errore durante l'aggiornamento del form con la forma scritta
            this.toastr.error(
              "Errore nell'attaccare la forma scritta",
              'Errore',
              {
                timeOut: 5000,
              }
            );
          }
        }
      } catch (error) {
        // Se si verifica un errore durante la creazione di un nuovo form
        if (error.status != 200) {
          this.toastr.error('Errore nella creazione del nuovo form', 'Errore', {
            timeOut: 5000,
          });
        }
      }
    }
  }

  ngOnDestroy(): void {
    //this.search_subscription.unsubscribe();
    this.get_languages_subscription.unsubscribe();
    this.get_morphology_subscription.unsubscribe();
    this.get_lex_entry_type_subscription.unsubscribe();
    this.get_form_type_subscription.unsubscribe();
    this.destroy$.next(true);
    this.destroy$.complete();
  }
}
