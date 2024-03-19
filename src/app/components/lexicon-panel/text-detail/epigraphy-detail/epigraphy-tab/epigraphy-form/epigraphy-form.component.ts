/*
  © Copyright 2021-2022  Istituto di Linguistica Computazionale "A. Zampolli", Consiglio Nazionale delle Ricerche, Pisa, Italy.
 
This file is part of EpiLexo.

EpiLexo is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

EpiLexo is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with EpiLexo. If not, see <https://www.gnu.org/licenses/>.
*/

import {
  AfterViewInit,
  ApplicationRef,
  Component,
  ComponentFactoryResolver,
  ComponentRef,
  ContentChild,
  ElementRef,
  HostListener,
  Injector,
  Input,
  OnDestroy,
  OnInit,
  QueryList,
  Renderer2,
  SimpleChanges,
  TemplateRef,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import {
  FormGroup,
  FormControl,
  Validators,
  FormArray,
  FormBuilder,
} from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { NgbPopover, NgbPopoverConfig } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectComponent } from '@ng-select/ng-select';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, of, Subject, Subscription } from 'rxjs';
import {
  catchError,
  debounceTime,
  filter,
  map,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs/operators';
import { AnnotatorService } from 'src/app/services/annotator/annotator.service';
import { DocumentSystemService } from 'src/app/services/document-system/document-system.service';
import { ExpanderService } from 'src/app/services/expander/expander.service';
import { LexicalEntriesService } from 'src/app/services/lexical-entries/lexical-entries.service';
import { SearchFormComponent } from './search-form/search-form.component';
declare var $: JQueryStatic;

@Component({
  selector: 'app-epigraphy-form',
  templateUrl: './epigraphy-form.component.html',
  styleUrls: ['./epigraphy-form.component.scss'],
})
export class EpigraphyFormComponent implements OnInit, OnDestroy {
  @Input() epiData: any;
  object: any;
  tokenArray: FormArray;
  textEpigraphy = '';
  leidenLines: any;

  epigraphy_text_subscription: Subscription;
  leiden_subscription: Subscription;
  translation_subscription: Subscription;
  delete_annotation_subscription: Subscription;

  private bind_subject: Subject<any> = new Subject();
  searchResults = [];
  memoryForms = [];

  selectedPopover = {
    htmlNodeName: '',
    tokenId: '',
  };

  spanSelection;

  data: object;
  sel_t: object;
  message: string;
  isOpen = false;
  bind = this;
  @ViewChildren('span_modal') spanPopovers: QueryList<any>;
  @ViewChild('search_form') searchForm: SearchFormComponent;

  //@ViewChild('span_modal') spanPopover: ElementRef;

  epigraphyForm = new FormGroup({
    tokens: new FormArray([this.createToken()]),
  });

  multiWordMode = false;
  annotationArray = [];
  token_annotationArray = [];
  epidoc_annotation_array = [];
  leiden_array = [];
  translation_array = [];

  fileId;

  isEmptyFile = false;
  fakeToken = false;

  destroy$: Subject<boolean> = new Subject();

  annotationSubject$: Subject<any> = new Subject();
  trashIcons: boolean[] = [];

  /**
   * Questo metodo viene chiamato quando viene rilasciato il tasto del mouse
   * sull'intero documento. Gestisce il comportamento in base alla situazione
   * dell'evento.
   *
   * @param event L'evento mouse-up generato
   */
  @HostListener('document:mouseup', ['$event'])
  onMouseUp(event): void {
    setTimeout(() => {
      try {
        let evtPath = Array.from(event.path);
        let isMultiwordRequest = false;

        // Verifica se l'evento è stato generato da un elemento con classe 'ok-button'
        evtPath.some((element: HTMLElement) => {
          if (element.classList != undefined) {
            if (element.classList.contains('ok-button')) {
              isMultiwordRequest = true;
              return true;
            } else {
              isMultiwordRequest;
              return false;
            }
          } else {
            return false;
          }
        });

        let event_el;

        // Se l'evento è legato a una richiesta multiword, esegue le azioni corrispondenti
        if (isMultiwordRequest) {
          let multiWordArray = Array.from(
            document.getElementsByClassName('multiword')
          );
          multiWordArray.forEach((element) => {
            let children = Array.from(element.children);
            children.forEach((subchild) => {
              if (subchild.classList.contains('multiword-button')) {
                event_el = element.children;
                subchild.remove();
              }
            });
          });

          // Aggiorna le classi degli elementi 'multiword' e gestisce le bordature
          document.querySelectorAll('.multiword').forEach((element) => {
            this.renderer.removeClass(element, 'multiword');
            this.renderer.addClass(element, 'multiword-span-' + 1);

            let prev = element.previousElementSibling;
            let next = element.nextElementSibling;

            if (prev != undefined) {
              if (prev.classList != undefined) {
                let classNames = prev.className;
                let matchTest = /(^|\s)(multiword-span-\d)(\s|$)/.test(
                  classNames
                );
                if (matchTest) {
                  this.renderer.addClass(element, 'border-left-0');
                }
              }
            } else if (next != undefined) {
              if (next.classList != undefined) {
                let classNames = next.className;
                let matchTest = /(^|\s)(multiword-span-\d)(\s|$)/.test(
                  classNames
                );
                if (matchTest) {
                  this.renderer.addClass(element, 'border-right-0');
                }
              }
            }
          });

          let position_popover;

          // Ottiene la posizione del popover associato all'evento
          Array.from(event_el).forEach((element: HTMLElement) => {
            position_popover = element.getAttribute('position');
            return;
          });

          // Azzera il messaggio e apre il popover associato
          this.message = '';
          this.spanPopovers.toArray()[position_popover - 1].open();

          // Imposta l'ID del popover selezionato e avvia la ricerca
          let popover_id =
            this.spanPopovers.toArray()[position_popover - 1]
              ._ngbPopoverWindowId;
          this.selectedPopover.tokenId = (position_popover - 1).toString();
          this.annotatorService.triggerSearch(null);
          this.selectedPopover.htmlNodeName = popover_id;

          // Ottiene gli span multiword e aggiorna l'array degli span selezionati
          let multiwordSpan = Array.from(
            document.querySelectorAll('[class*=multiword-span-]')
          );
          let spansArray = [];
          multiwordSpan.forEach((element) => {
            let children = Array.from(element.children);
            children.forEach((span) => {
              let position = parseInt(span.getAttribute('position'));
              let object = {
                start: this.object[position - 1].begin,
                end: this.object[position - 1].end,
              };

              spansArray.push(object);
            });
          });

          console.log(spansArray);
          this.spanSelection = spansArray;
        } else {
          // Se non è in modalità multiword, rimuove le classi 'multiword' e 'border-right-0'
          if (!this.multiWordMode) {
            document.querySelectorAll('.multiword').forEach((element) => {
              this.renderer.removeClass(element, 'multiword');
              this.renderer.removeClass(element, 'border-right-0');
            });
          }
        }
      } catch (error) {
        // Gestisce gli errori
        /* console.log(error) */
      }
    }, 10);
  }

  /**
   * Funzione richiamata quando si verifica un click sull'intero documento.
   * Gestisce il comportamento dei popover e la chiusura degli stessi.
   * @param event L'evento di click sul documento.
   */
  @HostListener('document:mousedown', ['$event'])
  onGlobalClick(event): void {
    setTimeout(() => {
      // PREVENIRE CHE I POPOVER SI CHIUDANO SE CLICCATI FUORI DAL COMPONENTE

      // Ottiene l'indice del popover selezionato
      let index = this.selectedPopover.tokenId;

      // SE IL CLICK AVVIENE FUORI QUESTO COMPONENTE, L'EVENTUALE POPOVER DEVE RESTARE APERTO,
      // SE SI CLICCA QUESTO COMPONENTE IL POPOVER VA CHIUSO E RIATTIVATO L'AUTOCLOSE
      if (index != '') {
        // Se il popover è aperto, impedisce la chiusura automatica
        let popover = this.spanPopovers.toArray()[index];
        /*  if (popover.isOpen()) {
         //console.log(popover.isOpen())
         //console.log(popover)
         //popover.autoClose = false;
       } */
      }
    }, 17);

    setTimeout(() => {
      try {
        let evtPath = Array.from(event.path);

        let htmlNode = document.getElementById(
          this.selectedPopover.htmlNodeName
        );

        let tokenId = this.selectedPopover.tokenId;

        // Controlla se il click è avvenuto all'interno del nodo HTML associato al popover
        if (evtPath.includes(htmlNode)) {
        } else {
          if (this.object != null) {
            this.object.forEach((element) => {
              // Chiude gli eventuali popover aperti che non appartengono a questo componente
              if (element.position != tokenId) {
                element.editing = false;
                this.selectedPopover.htmlNodeName = '';
                this.selectedPopover.tokenId = '';
              }
            });
          }

          let parentMarkElement = document.getElementsByClassName(
            'token-' + tokenId
          )[0];

          if (parentMarkElement != null) {
            let i = 0;
            Array.from(parentMarkElement.childNodes).forEach((element) => {
              let textMarkElement = element.textContent;
              let prev, next;
              if (element['classList'] != undefined) {
                if (
                  element['classList'].contains('mark') ||
                  element['classList'].contains('mark_test')
                ) {
                  prev = Array.from(parentMarkElement.childNodes)[i - 1];
                  next = Array.from(parentMarkElement.childNodes)[i];

                  if (next == element) {
                    next = Array.from(parentMarkElement.childNodes)[i + 1];
                  }

                  if (prev != undefined) {
                    if (prev.nodeName == '#text') {
                      textMarkElement = prev.textContent += textMarkElement;
                      prev.remove();
                    }
                  }

                  if (next != undefined) {
                    if (next.nodeName == '#text') {
                      textMarkElement += next.textContent;
                      next.remove();
                    }
                  }

                  // Crea un nuovo nodo di testo con il contenuto combinato
                  const text = this.renderer.createText(textMarkElement);

                  // Sostituisce il nodo HTML con il nuovo nodo di testo
                  this.renderer.insertBefore(parentMarkElement, text, element);
                  element.remove();
                }
              }
              i++;
            });
          }
        }
      } catch (e) {
        /* console.log(e) */
      }
    }, 17);
  }

  constructor(
    private annotatorService: AnnotatorService,
    private renderer: Renderer2,
    private documentService: DocumentSystemService,
    private formBuilder: FormBuilder,
    private toastr: ToastrService,
    private lexicalService: LexicalEntriesService
  ) {}

  ngOnInit(): void {
    // Creazione del FormGroup per il modulo di epigrafia, con un array di token iniziale
    this.epigraphyForm = this.formBuilder.group({
      tokens: this.formBuilder.array([this.createToken()]),
    });

    // Sottoscrizione ai dati del testo epigrafico dal servizio del documento
    this.epigraphy_text_subscription =
      this.documentService.epigraphyTextData$.subscribe(
        (data) => {
          if (data != null) {
            this.textEpigraphy = data; // Se i dati non sono nulli, assegna il testo epigrafico
          } else {
            this.textEpigraphy = ''; // Altrimenti, imposta il testo epigrafico vuoto
          }
        },
        (error) => {
          console.log(error); // Gestione degli errori, stampa su console in caso di errore
        }
      );

    // Sottoscrizione ai dati di Leiden dal servizio del documento
    this.leiden_subscription =
      this.documentService.epigraphyLeidenData$.subscribe(
        (data) => {
          console.log(data); // Stampa i dati ricevuti dal servizio sul log
          if (data != null) {
            this.leidenLines = data; // Se i dati non sono nulli, assegna le linee di Leiden
          } else {
            this.leidenLines = []; // Altrimenti, imposta un array vuoto per le linee di Leiden
          }
        },
        (error) => {
          console.log(error); // Gestione degli errori, stampa su console in caso di errore
        }
      );

    // Sottoscrizione ai dati della traduzione epigrafica dal servizio del documento
    this.translation_subscription =
      this.documentService.epigraphyTranslationData$.subscribe(
        (data) => {
          console.log(data); // Stampa i dati ricevuti dal servizio sul log
          if (data != null) {
            this.translation_array = data; // Se i dati non sono nulli, assegna l'array di traduzione
          } else {
            this.translation_array = []; // Altrimenti, imposta un array vuoto per la traduzione
          }
        },
        (error) => {
          console.log(error); // Gestione degli errori, stampa su console in caso di errore
        }
      );

    // Sottoscrizione al subject di bind con debounce time e unobservable
    this.bind_subject
      .pipe(debounceTime(100), takeUntil(this.destroy$))
      .subscribe((data) => {
        /* console.log(data) */
        this.bindSelection(data.popover, data.evt, data.i); // Esegue il bind della selezione
      });

    // Sottoscrizione alla richiesta di eliminazione di un token
    this.annotatorService.deleteTokenReq$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (data) {
          console.log(data); // Stampa i dati ricevuti sulla richiesta di eliminazione del token
          this.removeToken(data); // Rimuove il token
        }
      });

    // Sottoscrizione alla richiesta di eliminazione di una annotazione
    this.delete_annotation_subscription =
      this.annotatorService.deleteAnnoReq$.subscribe((data) => {
        let localArray = []; // Array locale per gestire l'aggiornamento delle annotazioni
        if (data != null) {
          this.annotationArray = this.annotationArray.filter((element) => {
            return element.id != data.id; // Filtra l'array delle annotazioni per rimuovere quella con l'ID corrispondente
          });

          if (this.object != undefined) {
            this.object.forEach((element) => {
              if (element.id == data.node_id) {
                let start = element.begin; // Ottiene l'inizio dell'elemento
                let end = element.end; // Ottiene la fine dell'elemento

                // Filtra l'array delle annotazioni per trovare quelle comprese tra l'inizio e la fine dell'elemento
                this.annotationArray.forEach((element) => {
                  if (
                    element.spans[0].start >= start &&
                    element.spans[0].end <= end
                  ) {
                    localArray.push(element); // Aggiunge le annotazioni trovate all'array locale
                  }
                });

                console.log(localArray, localArray.length); // Stampa l'array locale e la sua lunghezza sul log

                if (localArray.length == 0) {
                  let position = element.position; // Ottiene la posizione dell'elemento
                  let elementHTML = document.getElementsByClassName(
                    'token-' + (position - 1)
                  )[0]; // Ottiene l'elemento HTML corrispondente
                  this.renderer.removeClass(elementHTML, 'annotation'); // Rimuove la classe 'annotation' dall'elemento HTML
                }
              }
            });
          }
        }
      });

    /**
     * Questa sottoscrizione aggiunge un token all'array 'object' ogni volta che viene emesso un nuovo token da 'addToken$'.
     * Impedisce anche eventuali perdite di risorse disconnettendo l'osservabile quando il componente viene distrutto.
     */
    this.annotatorService.addToken$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        if (data != null) {
          this.object.push(data);
          this.fakeToken = true;
        }
      });

    /**
     * Questa sequenza di operazioni gestisce l'aggiornamento delle annotazioni:
     * 1. Prende i cambiamenti dall'oggetto 'annotationSubject$'.
     * 2. Impone un ritardo di 2000 ms con 'debounceTime' per evitare richieste troppo frequenti.
     * 3. Memorizza temporaneamente il nuovo valore XML ricevuto.
     * 4. Effettua una richiesta al servizio annotatore per ottenere le annotazioni relative all'ID dell'elemento.
     * 5. Mappa le annotazioni ricevute nel formato desiderato.
     * 6. Attacca eventuali annotazioni di Leiden al documento XML.
     * 7. Mappa il risultato finale nel formato richiesto.
     * Infine, stampa i dati sulla console.
     */
    this.annotationSubject$
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(2000),
        tap((changes) => {
          this.tempXml = changes.epiData.currentValue['xmlDoc'];
        }),
        switchMap((changes) =>
          this.annotatorService.getAnnotation(
            changes.epiData.currentValue['element_id']
          )
        ),
        map((annotations) => this.mapAnnotations(annotations)),
        switchMap((annotations) => this.attachLeiden()),
        map((xmlList) => this.mapLeidenNodes(xmlList))
      )
      .subscribe((data) => {
        console.log(data);
      });
  }

  /**
   * Metodo per mappare i nodi Leiden da un elenco XML.
   * @param xmlList Elenco XML contenente i nodi Leiden.
   */
  mapLeidenNodes(xmlList) {
    // Stampa l'elenco XML ricevuto in ingresso per debug.
    console.log(xmlList);

    // Estrae il testo grezzo dall'elenco XML.
    let raw = xmlList['xml'];

    // Parsa il testo grezzo come documento HTML e ne estrae il corpo.
    let bodyResponse = new DOMParser().parseFromString(raw, 'text/html').body;

    // Stringa per contenere il token Leiden.
    let leidenToken = '';

    // Itera sui nodi figlio del corpo del documento HTML.
    bodyResponse.childNodes.forEach((x) => {
      if (x.nodeName != undefined) {
        // Verifica se il nodo è un nodo testo.
        if (x.nodeName == '#text') {
          // Concatena il valore del nodo testo al token Leiden, rimuovendo eventuali caratteri di nuova riga.
          leidenToken += x.nodeValue.replace('\n', '');
        }
      }
    });
  }

  /**
   * Metodo per collegare gli elementi Leiden alle annotazioni.
   * Invia richieste HTTP per ottenere le annotazioni di testo Leiden.
   */
  tempXml: any;
  attachLeiden() {
    // Array per contenere le richieste HTTP.
    let httpReq = [];

    // Verifica se ci sono annotazioni nell'array.
    if (this.annotationArray.length > 0) {
      // Verifica se l'oggetto non è nullo.
      if (this.object != null) {
        // Itera sugli elementi dell'oggetto.
        for (const element of this.object) {
          let startElement = element.begin;
          let endElement = element.end;

          // Itera sulle annotazioni presenti nell'array delle annotazioni.
          for (const annotation of this.annotationArray) {
            if (annotation.spans.length == 1) {
              let startAnnotation = annotation.spans[0].start;
              let endAnnotation = annotation.spans[0].end;

              // Verifica se l'annotazione è compresa nell'elemento.
              if (
                startAnnotation >= startElement &&
                endAnnotation <= endElement
              ) {
                let positionElement = element.position;
                let elementHTML = document.getElementsByClassName(
                  'token-' + (positionElement - 1)
                )[0];
                var that = this;

                // Verifica se l'elemento è presente nel documento XML temporaneo.
                if (
                  Array.from(
                    this.tempXml.querySelectorAll(
                      "[*|id='" + element.xmlid + "']"
                    )
                  ).length > 0
                ) {
                  // Ottiene il nodo XML corrispondente all'elemento.
                  let xmlNode = this.tempXml.querySelectorAll(
                    "[*|id='" + element.xmlid + "']"
                  )[0].outerHTML;
                  let object = {
                    xmlString: xmlNode,
                  };

                  // Aggiunge la classe 'annotation' all'elemento HTML corrispondente.
                  if (elementHTML != undefined) {
                    that.renderer.addClass(elementHTML, 'annotation');
                  }

                  // Verifica se l'annotazione non ha un attributo 'leiden'.
                  if (annotation.attributes.leiden == undefined) {
                    // Aggiunge la richiesta HTTP per convertire il testo in formato Leiden.
                    httpReq.push(this.documentService.testConvertItAnt(object));
                  }
                }
              }
            }
          }
        }

        // Verifica se ci sono richieste HTTP da elaborare.
        if (httpReq.length > 0) {
          // Esegue le richieste HTTP in parallelo utilizzando forkJoin.
          return forkJoin(httpReq).pipe(
            // Gestisce eventuali errori durante la conversione del testo in formato Leiden.
            catchError((err) => {
              this.toastr.error(
                'Errore nella conversione del testo Leiden',
                'Errore',
                {
                  timeOut: 5000,
                }
              );
              return of(0);
            })
          );
        } else {
          // Ritorna un observable vuoto se non ci sono richieste HTTP da elaborare.
          return of([]);
        }
      } else {
        // Ritorna un observable vuoto se l'oggetto è nullo.
        return of([]);
      }
    } else {
      // Ritorna un observable vuoto se l'array delle annotazioni è vuoto.
      return of([]);
    }
  }

  /**
   * Metodo per mappare le annotazioni.
   * @param annotations Oggetto contenente le annotazioni.
   */
  mapAnnotations(annotations) {
    // Verifica se l'oggetto contiene annotazioni.
    if (annotations.annotations != undefined) {
      // Itera sulle annotazioni presenti nell'oggetto.
      annotations.annotations.forEach((element) => {
        // Verifica il layer dell'annotazione.
        if (element.layer == 'attestation') {
          // Verifica se l'annotazione non ha un attributo 'bibliography'.
          if (element.attributes.bibliography == undefined) {
            // Crea un array vuoto per l'attributo 'bibliography'.
            element.attributes['bibliography'] = [];
          }

          // Verifica se l'attributo 'bibliography' non è un array.
          if (!Array.isArray(element.attributes.bibliography)) {
            // Converte l'attributo 'bibliography' in un array.
            let tmp_arr = [];
            tmp_arr.push(element.attributes['bibliography']);
            element.attributes['bibliography'] = tmp_arr;
          }

          // Verifica se l'attributo 'bibliography' è un array.
          if (Array.isArray(element.attributes['bibliography'])) {
            // Itera sugli elementi dell'array 'bibliography'.
            Array.from(element.attributes['bibliography']).forEach(
              (element) => {
                // Verifica se l'elemento 'note' è indefinito.
                if (element['note'] == undefined) {
                  // Imposta l'elemento 'note' su una stringa vuota.
                  element['note'] = '';
                }

                // Verifica se l'elemento 'textualRef' è indefinito.
                if (element['textualRef'] == undefined) {
                  // Imposta l'elemento 'textualRef' su una stringa vuota.
                  element['textualRef'] = '';
                }
              }
            );
          }

          // Verifica se il file è vuoto.
          if (this.isEmptyFile) {
            // Aggiunge un flag 'empty_file' all'annotazione.
            element['empty_file'] = this.isEmptyFile;

            // Verifica se l'annotazione non ha un attributo 'leiden'.
            if (element.attributes.leiden == undefined) {
              // Imposta l'attributo 'leiden' su una stringa vuota.
              element.attributes.leiden = '';
            }
          } else {
            // Aggiunge un flag 'empty_file' all'annotazione.
            element['empty_file'] = this.isEmptyFile;
          }

          // Aggiunge l'annotazione all'array delle annotazioni.
          this.annotationArray.push(element);
        } else if (element.layer == 'epidoc') {
          // Aggiunge l'annotazione all'array delle annotazioni Epidoc.
          this.epidoc_annotation_array.push(element);
        }
      });

      // Notifica il pannello di attestazione che ci sono annotazioni disponibili.
      this.lexicalService.triggerAttestationPanel(true);

      // Invia le annotazioni al pannello di attestazione.
      this.lexicalService.sendToAttestationPanel(this.annotationArray);
    } else {
      // Se non ci sono annotazioni nell'oggetto, resetta gli array di annotazioni e notifica il pannello di attestazione.
      this.annotationArray = [];
      this.epidoc_annotation_array = [];
      this.lexicalService.triggerAttestationPanel(null);
      this.lexicalService.sendToAttestationPanel(null);
    }
  }

  /**
   * Metodo che viene chiamato quando ci sono cambiamenti nelle proprietà di input.
   * @param changes Oggetti che contengono le modifiche rilevate.
   */
  ngOnChanges(changes: SimpleChanges) {
    // Verifica se ci sono modifiche nei dati epigrafici.
    if (changes.epiData.currentValue != null) {
      // Verifica se l'oggetto corrente è diverso dall'oggetto precedente.
      if (this.object != changes.epiData.currentValue) {
        // Resetta l'array dei token e le selezioni di span.
        this.tokenArray = this.epigraphyForm.get('tokens') as FormArray;
        this.tokenArray.clear();
        this.spanSelection = null;
        this.annotationArray = [];
        this.epidoc_annotation_array = [];
      }

      // Imposta l'oggetto con i nuovi dati epigrafici.
      this.object = changes.epiData.currentValue['tokens'];

      // Verifica se l'oggetto è vuoto.
      if (this.object.length == 0) {
        this.isEmptyFile = true;
        console.log('FILE VUOTO');
      } else {
        // Verifica se l'oggetto contiene token fittizi.
        this.isEmptyFile = this.object.some(
          (object) => object.source === 'fake'
        );
        this.fakeToken = this.object.some((object) => object.source === 'fake');
        console.log('FILE NON VUOTO');
      }

      // Notifica il subject delle annotazioni sulle modifiche rilevate.
      this.annotationSubject$.next(changes);
    } else {
      // Se non ci sono dati epigrafici, imposta l'oggetto su null.
      this.object = null;
    }
  }

  /**
   * Crea un FormGroup contenente un FormControl per l'entità specificata, se fornita,
   * altrimenti crea un FormControl vuoto.
   * @param token L'entità da inserire nel FormControl, opzionale.
   * @returns Un FormGroup contenente un FormControl per l'entità specificata.
   */
  createToken(token?) {
    if (token != undefined) {
      return this.formBuilder.group({
        entity: new FormControl(token),
      });
    } else {
      return this.formBuilder.group({
        entity: new FormControl(''),
      });
    }
  }

  /**
   * Gestisce l'evento di inserimento in una cella della tabella.
   * Se la cella non contiene un punto, due punti o è vuota, imposta la selezione sull'oggetto corrispondente.
   * @param evt L'evento dell'elemento HTML.
   * @param i L'indice della cella nell'array degli oggetti.
   */
  enterCell(evt, i) {
    if (
      evt.target.innerText != '.' &&
      evt.target.innerText != ':' &&
      evt.target.innerText != ''
    ) {
      let parentNode = evt.target.parentElement;
      if (parentNode != undefined) {
        let classNames = parentNode.className;
        let matchTest = /(^|\s)(multiword-span-\d)(\s|$)/.test(classNames);
        if (matchTest) {
          // La cella contiene una classe multiword, non fare nulla.
        } else {
          // Imposta l'oggetto selezionato sull'indice specificato.
          this.object[i]['selected'] = true;

          // Cancella la selezione del testo.
          if (window.getSelection) {
            if (window.getSelection().empty) {
              // Chrome
              window.getSelection().empty();
            } else if (window.getSelection().removeAllRanges) {
              // Firefox
              window.getSelection().removeAllRanges();
            }
          }
        }
      }
    }
  }

  /**
   * Rimuove un token dall'array degli oggetti in base all'ID del token specificato.
   * @param token_id L'ID del token da rimuovere.
   */
  removeToken(token_id) {
    console.log(token_id);

    const index = this.object.findIndex((obj) => obj.id === token_id);

    if (index > -1) {
      this.object.splice(index, 1);
    }
  }

  /**
   * Gestisce l'evento di uscita da una cella della tabella.
   * Imposta l'oggetto selezionato sull'indice specificato su "non selezionato".
   * @param evt L'evento dell'elemento HTML.
   * @param i L'indice della cella nell'array degli oggetti.
   */
  leavingCell(evt, i) {
    this.object[i]['selected'] = false;
  }

  /**
   * Cancella la selezione effettuata in una cella della tabella.
   * @param popover Il popover associato all'evento.
   * @param evt L'evento dell'elemento HTML.
   * @param i L'indice della cella nell'array degli oggetti.
   */
  deleteSelection(popover, evt, i) {
    setTimeout(() => {}, 10);
    let popoverHtml = popover._elementRef.nativeElement;

    // Se ci sono annotazioni nel popover, non fare nulla.
    if (popoverHtml.querySelectorAll('.annotation').length > 0) {
      // Ci sono annotazioni nel popover, non fare nulla.
    } else {
      // Rimuovi eventuali spazi vuoti all'inizio e alla fine del popover.
      popoverHtml.textContent = popoverHtml.textContent.trim();
    }
  }

  /**
   * Attiva l'evento di binding del popover per una cella della tabella.
   * @param popover Il popover associato all'evento.
   * @param evt L'evento dell'elemento HTML.
   * @param i L'indice della cella nell'array degli oggetti.
   */
  triggerBind(popover, evt, i) {
    if (!this.multiWordMode) {
      if (
        evt.target.innerText != '.' &&
        evt.target.innerText != ':' &&
        evt.target.innerText != ''
      ) {
        // Invia il popover, l'evento e l'indice alla prossima funzione di binding.
        this.bind_subject.next({ popover, evt, i });
      }
    } else {
      // Se il multiWordMode è attivo, avvia la creazione di una parola multipla.
      console.log(popover);
      this.multiWordCreator(popover, evt, i);
    }
  }

  /**
   * Gestisce la creazione di una parola multipla.
   * @param popover Il popover associato all'evento.
   * @param evt L'evento dell'elemento HTML.
   * @param i L'indice della cella nell'array degli oggetti.
   */
  multiWordCreator(popover, evt, i) {
    let span =
      popover._elementRef.nativeElement.parentNode.parentNode.childNodes[i];
    let prevSibling, nextSibling;
    prevSibling = popover._elementRef.nativeElement.parentNode.previousSibling;
    nextSibling = popover._elementRef.nativeElement.parentNode.nextSibling;

    if (span.classList.contains('multiword')) {
      // Se la cella è già una parola multipla, rimuovi le classi e i pulsanti aggiunti.
      this.renderer.removeClass(span, 'multiword');
      if (prevSibling != null) {
        if (prevSibling.classList.contains('multiword')) {
          this.renderer.removeClass(prevSibling, 'border-right-0');
        }
      }
      if (nextSibling != null) {
        if (nextSibling.classList != undefined) {
          if (nextSibling.classList.contains('multiword')) {
            this.renderer.removeClass(span, 'border-right-0');
          }
        }
      }
      let multiWordArray = Array.from(
        document.getElementsByClassName('multiword')
      );
      multiWordArray.forEach((element) => {
        let children = Array.from(element.children);
        children.forEach((subchild) => {
          if (subchild.classList.contains('multiword-button')) {
            subchild.remove();
          }
        });
      });

      // Se ci sono più parole multiple, crea pulsanti dinamici per l'ultima parola multipla.
      if (multiWordArray.length > 1) {
        console.log(multiWordArray[multiWordArray.length - 1]);
        this.createDynamicButtons(multiWordArray[multiWordArray.length - 1]);
      }
    } else {
      // Se la cella non è una parola multipla, aggiungi le classi e i pulsanti appropriati.
      this.renderer.addClass(span, 'multiword');
      if (prevSibling != null) {
        if (prevSibling.classList.contains('multiword')) {
          this.renderer.addClass(prevSibling, 'border-right-0');
        }
      }
      if (nextSibling != null) {
        if (nextSibling.classList != undefined) {
          if (nextSibling.classList.contains('multiword')) {
            this.renderer.addClass(span, 'border-right-0');
          }
        }
      }
      let multiWordArray = Array.from(
        document.getElementsByClassName('multiword')
      );
      multiWordArray.forEach((element) => {
        let children = Array.from(element.children);
        children.forEach((subchild) => {
          if (subchild.classList.contains('multiword-button')) {
            subchild.remove();
          }
        });
      });

      // Se ci sono più parole multiple, crea pulsanti dinamici per la parola corrente.
      if (multiWordArray.length > 1) {
        this.createDynamicButtons(span);
      } else if (multiWordArray.length == 1) {
        multiWordArray.forEach((element) => {
          let children = Array.from(element.children);
          children.forEach((subchild) => {
            if (subchild.classList.contains('multiword-button')) {
              subchild.remove();
            }
          });
        });
      }
    }
  }

  /**
   * Crea i pulsanti dinamici per l'interfaccia utente.
   * @param span Il tag span in cui verranno aggiunti i pulsanti.
   */
  createDynamicButtons(span) {
    // Crea un elemento div per contenere i pulsanti
    let div = this.renderer.createElement('div');
    this.renderer.addClass(div, 'multiword-button');

    // Crea due pulsanti: okButton e leaveButton
    let okButton = this.renderer.createElement('button');
    let leaveButton = this.renderer.createElement('button');

    // Crea due icone per i pulsanti
    let okIcon = this.renderer.createElement('i');
    this.renderer.addClass(okIcon, 'fas');
    this.renderer.addClass(okIcon, 'fa-check');

    let leaveIcon = this.renderer.createElement('i');
    this.renderer.addClass(leaveIcon, 'fas');
    this.renderer.addClass(leaveIcon, 'fa-times');

    // Aggiunge le icone ai rispettivi pulsanti
    this.renderer.appendChild(okButton, okIcon);
    this.renderer.appendChild(leaveButton, leaveIcon);

    // Imposta le posizioni e le dimensioni dei pulsanti
    this.renderer.setStyle(okButton, 'position', 'absolute');
    this.renderer.setStyle(okButton, 'top', '-1.5rem');
    this.renderer.setStyle(okIcon, 'font-size', '10px');
    this.renderer.setStyle(okIcon, 'width', '10px');
    this.renderer.setStyle(leaveButton, 'position', 'absolute');
    this.renderer.setStyle(leaveButton, 'top', '-1.5rem');
    this.renderer.setStyle(leaveIcon, 'font-size', '10px');
    this.renderer.setStyle(leaveIcon, 'width', '10px');
    this.renderer.setStyle(leaveButton, 'left', '1.5rem');

    // Aggiunge le classi ai pulsanti
    this.renderer.addClass(okButton, 'ok-button');
    this.renderer.addClass(leaveButton, 'no-button');

    // Aggiunge i pulsanti al div
    this.renderer.appendChild(div, okButton);
    this.renderer.appendChild(div, leaveButton);

    // Aggiunge il div al tag span
    this.renderer.appendChild(span, div);
  }

  /**
   * Popola le annotazioni locali in base ai dati del token.
   * @param tokenData I dati del token utilizzati per popolare le annotazioni locali.
   */
  populateLocalAnnotation(tokenData) {
    // Inizializza l'array delle annotazioni per il token corrente
    this.token_annotationArray = [];

    // Itera attraverso le annotazioni esistenti
    this.annotationArray.forEach((annotation) => {
      let start_token, end_token;

      // Verifica se il file è vuoto o meno per impostare i token di inizio e fine
      if (!this.isEmptyFile) {
        start_token = tokenData.begin;
        end_token = tokenData.end;
      } else {
        start_token = tokenData.spans[0].start;
        end_token = tokenData.spans[0].end;
      }

      // Controlla se lo span dell'annotazione rientra nel token corrente
      annotation.spans.forEach((element) => {
        if (element.start >= start_token && element.end <= end_token) {
          this.token_annotationArray.push(annotation);
        }
      });
    });

    // Se sono presenti annotazioni per il token, attiva il pannello di attestazione
    if (this.token_annotationArray.length > 0) {
      this.lexicalService.triggerAttestationPanel(true);
      this.lexicalService.sendToAttestationPanel(this.token_annotationArray);
    }
  }

  /**
   * Associa la selezione del popover all'evento specifico.
   * @param popover Il popover attivo.
   * @param evt L'evento di selezione.
   * @param i L'indice dell'oggetto token.
   */
  bindSelection(popover, evt, i) {
    console.log(this.object[i]);

    // Inizializza l'array delle annotazioni per il token corrente
    this.token_annotationArray = [];

    // Itera attraverso le annotazioni esistenti
    this.annotationArray.forEach((annotation) => {
      let start_token = this.object[i].begin;
      let end_token = this.object[i].end;

      // Controlla se lo span dell'annotazione rientra nel token corrente
      if (annotation.spans.length == 1) {
        annotation.spans.forEach((element) => {
          if (element.start >= start_token && element.end <= end_token) {
            this.token_annotationArray.push(annotation);
          }
        });
      } else {
        // Altre azioni se lo span dell'annotazione non rientra nel token
      }
    });

    // Se sono presenti annotazioni per il token, attiva il pannello di attestazione
    if (this.token_annotationArray.length > 0) {
      this.lexicalService.triggerAttestationPanel(true);
      this.lexicalService.sendToAttestationPanel(this.token_annotationArray);
    } else {
      // Nasconde il pannello di attestazione se non ci sono annotazioni
      this.lexicalService.triggerAttestationPanel(false);
      this.lexicalService.sendToAttestationPanel(null);
    }

    // Esegue alcune azioni dopo un breve ritardo
    setTimeout(() => {
      // Resetta il messaggio
      this.message = '';
      // Imposta lo stato di editing sull'oggetto token corrente
      this.object[i]['editing'] = true;
      // Ottiene il testo selezionato
      this.message = window.getSelection().toString();

      // Gestisce il popover attivo
      if (this.selectedPopover.htmlNodeName == '') {
        this.selectedPopover.htmlNodeName = popover._ngbPopoverWindowId;
        this.selectedPopover.tokenId = i;
      } else if (popover._ngbPopoverWindowId != this.selectedPopover) {
        this.selectedPopover.htmlNodeName = popover._ngbPopoverWindowId;
        this.selectedPopover.tokenId = i;
        this.object.forEach((element) => {
          if (element.id != i + 1) {
            element.editing = false;
          } else {
            element.editing = true;
          }
        });
      }

      // Gestisce lo stato del popover
      if (popover.isOpen()) {
        // Il popover è aperto
      } else if (!popover.isOpen()) {
        // Il popover è chiuso, lo apre
        popover.open();
      }

      // Ottiene alcuni elementi e informazioni sulla selezione
      let popoverHtml = popover._elementRef.nativeElement;
      let innerText = popoverHtml.innerText;
      let selection = document.getSelection();
      let anchorNode = selection.anchorNode;
      let focusNode = selection.focusNode;
      let isThereMark, areThereAnnotations;

      // Gestisce il caso in cui la selezione non sia nulla
      if (anchorNode != null && focusNode != null) {
        let anchorNodeParent = selection.anchorNode.parentNode;
        let focusNodeParent = selection.focusNode.parentNode;

        // Verifica se la selezione è all'interno dello stesso nodo e se c'è un messaggio selezionato
        if (anchorNodeParent == focusNodeParent && this.message != '') {
          if (
            selection.anchorNode.textContent.trim().length ==
              innerText.length &&
            this.message != innerText
          ) {
            let anchorOffset = selection.anchorOffset;
            let focusOffset = selection.focusOffset;

            if (anchorOffset > focusOffset) {
              let tmp = anchorOffset;
              anchorOffset = focusOffset;
              focusOffset = tmp;
            }

            // Crea un nuovo span per la selezione e lo inserisce nel popover
            popoverHtml.innerText = '';
            const span = this.renderer.createElement('span');
            const l_text = this.renderer.createText(
              innerText.substring(0, anchorOffset)
            );
            const text = this.renderer.createText(this.message);
            const r_text = this.renderer.createText(
              innerText.substring(focusOffset, innerText.length)
            );

            this.renderer.appendChild(span, text);
            this.renderer.appendChild(popoverHtml, span);
            this.renderer.addClass(span, 'mark'),
              this.renderer.setAttribute(
                span,
                'startoffset',
                anchorOffset.toString()
              );
            this.renderer.setAttribute(
              span,
              'endoffset',
              focusOffset.toString()
            );

            if (l_text.textContent != '') {
              this.renderer.insertBefore(popoverHtml, l_text, span);
            }

            if (r_text.textContent != '') {
              this.renderer.appendChild(popoverHtml, r_text);
            }

            // Emette un evento per avviare la ricerca dell'annotazione
            this.spanSelection = {};
            this.spanSelection['start'] = this.object[i].begin + anchorOffset;
            this.spanSelection['end'] = this.object[i].begin + focusOffset;
            this.annotatorService.triggerSearch(this.message);
          } else if (
            selection.anchorNode.textContent.trim().length ==
              innerText.length &&
            this.message == innerText
          ) {
            // Se il messaggio selezionato è lo stesso dell'innerText, resetta il messaggio
            this.message = '';
            this.annotatorService.triggerSearch(innerText);
          }
        } else if (this.message == '') {
          // Se non c'è nessun messaggio selezionato, avvia la ricerca dell'annotazione sull'innerText
          this.annotatorService.triggerSearch(innerText);
          this.spanSelection = {};
          this.spanSelection['start'] = 0;
          this.spanSelection['end'] = 0;
        }
      }

      // Gestisce il testo selezionato all'interno di un elemento multiword-span
      let parentNode = evt.target.parentElement;
      let classNames = parentNode.className;

      if (/(^|\s)(multiword-span-\d)(\s|$)/.test(classNames)) {
        let multiwordSpan = Array.from(
          document.querySelectorAll('[class*=multiword-span-]')
        );
        let text = '';
        multiwordSpan.forEach((element) => {
          text += element.textContent + ' ';
        });
        // Avvia la ricerca dell'annotazione basata sul testo dei multiword-span
        //this.annotatorService.triggerSearch(text);
      }
    }, 100);
  }

  /**
   * Avvia una ricerca vuota.
   */
  triggerEmptySearch() {
    this.annotatorService.triggerSearch('');
  }

  /**
   * Elimina un'annotazione.
   * @param annotation L'annotazione da eliminare.
   * @param index L'indice dell'annotazione nell'array.
   * @param token Il token associato all'annotazione.
   */
  async deleteAnnotation(annotation, index, token) {
    let anno_id = annotation.id;
    let token_position = token.position;

    try {
      // Effettua una richiesta per eliminare l'annotazione
      let delete_anno_req = await this.annotatorService
        .deleteAnnotation(anno_id)
        .toPromise();
      console.log(delete_anno_req);

      // Rimuove l'annotazione dagli array
      this.token_annotationArray.splice(index, 1);
      this.annotationArray.splice(index, 1);
      this.lexicalService.triggerAttestationPanel(false);
    } catch (error) {
      // Gestisce gli errori durante l'eliminazione dell'annotazione
      if (error.status == 200) {
        this.token_annotationArray.splice(index, 1);
        this.annotationArray.splice(index, 1);
      } else {
        this.toastr.error(
          'Qualcosa è andato storto, controlla il log',
          'Errore',
          {
            timeOut: 5000,
          }
        );
      }
    }
  }

  /**
   * Elimina un token.
   * @param index L'indice del token da eliminare.
   */
  deleteToken(index: number) {
    // Effettua una richiesta per eliminare il token
    this.annotatorService
      .deleteToken(this.object[index].id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (data) => {
          // Rimuove il token dall'array
          this.object.splice(index, 1);
          this.toastr.success('Token eliminato', 'Successo', { timeOut: 5000 });
        },
        (error) => {
          // Gestisce gli errori durante l'eliminazione del token
          if (error.status != 200) {
            this.toastr.error("Errore nell'eliminazione del token", 'Errore', {
              timeOut: 5000,
            });
          }
        }
      );
  }

  /**
   * Mostra tutte le annotazioni presenti.
   */
  showAllAnnotations() {
    // Attiva il pannello di attestazione e invia tutte le annotazioni ad esso
    this.lexicalService.triggerAttestationPanel(true);
    this.lexicalService.sendToAttestationPanel(this.annotationArray);
  }

  /**
   * Sostituisce una porzione di testo con un'altra.
   * @param origin Il testo originale.
   * @param startIndex L'indice di inizio della porzione da sostituire.
   * @param endIndex L'indice di fine della porzione da sostituire.
   * @param insertion Il testo da inserire al posto della porzione originale.
   * @returns Il testo modificato.
   */
  replaceBetween(origin, startIndex, endIndex, insertion) {
    return (
      origin.substring(0, startIndex) + insertion + origin.substring(endIndex)
    );
  }

  /**
   * Esegue operazioni di pulizia quando il componente viene distrutto.
   */
  ngOnDestroy() {
    // Annulla la sottoscrizione agli eventi
    this.epigraphy_text_subscription.unsubscribe();
    this.leiden_subscription.unsubscribe();
    this.translation_subscription.unsubscribe();
    this.delete_annotation_subscription.unsubscribe();
    this.destroy$.next(true);
    this.destroy$.complete();
  }
}
