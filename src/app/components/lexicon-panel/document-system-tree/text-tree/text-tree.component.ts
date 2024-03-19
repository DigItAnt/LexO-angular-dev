/*
  © Copyright 2021-2022  Istituto di Linguistica Computazionale "A. Zampolli", Consiglio Nazionale delle Ricerche, Pisa, Italy.
 
This file is part of EpiLexo.

EpiLexo is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

EpiLexo is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with EpiLexo. If not, see <https://www.gnu.org/licenses/>.
*/

import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  OnDestroy,
  OnInit,
  Output,
  Renderer2,
  ViewChild,
} from '@angular/core';
import {
  FormGroup,
  FormControl,
  Validators,
  FormArray,
  FormBuilder,
  ValidatorFn,
  AbstractControl,
} from '@angular/forms';
import {
  TreeNode,
  TreeModel,
  TREE_ACTIONS,
  KEYS,
  IActionMapping,
  ITreeOptions,
} from '@circlon/angular-tree-component';
import { ModalComponent } from 'ng-modal-lib';
import { ContextMenuComponent } from 'ngx-contextmenu';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, debounceTime, take, takeUntil } from 'rxjs/operators';
import { AnnotatorService } from 'src/app/services/annotator/annotator.service';
import { AuthService } from 'src/app/services/auth/auth.service';
import { DocumentSystemService } from 'src/app/services/document-system/document-system.service';
import { ExpanderService } from 'src/app/services/expander/expander.service';
import { LexicalEntriesService } from 'src/app/services/lexical-entries/lexical-entries.service';
import { v4 } from 'uuid';

const actionMapping: IActionMapping = {
  mouse: {
    click: (tree, node, $event) => {
      $event.shiftKey
        ? TREE_ACTIONS.TOGGLE_ACTIVE_MULTI(tree, node, $event)
        : TREE_ACTIONS.TOGGLE_ACTIVE(tree, node, $event);

      if (node.data.rename_mode) {
        $event.preventDefault();
      }
    },
    expanderClick: (tree, node, $event) => {
      if (node.data.rename_mode) {
        $event.preventDefault();
      } else {
        TREE_ACTIONS.TOGGLE_EXPANDED(tree, node, $event);
      }
    },
  },
  keys: {
    [KEYS.ENTER]: (tree, node, $event) => alert(`This is ${node.data.name}`),
  },
};

@Component({
  selector: 'app-text-tree',
  templateUrl: './text-tree.component.html',
  styleUrls: ['./text-tree.component.scss'],
  providers: [DatePipe],
})
export class TextTreeComponent implements OnInit, OnDestroy {
  // Emittente di eventi per caricare dati in un modal relativo a un albero. Viene utilizzato per comunicare tra componenti che necessitano di caricare o modificare dati nell'albero.
  @Output() loadModalTreeData = new EventEmitter<any>();

  // Riferimento all'elemento DOM di "metadata_tags" utilizzato per accedere e manipolare direttamente l'elemento nel template HTML.
  @ViewChild('metadata_tags') metadata_tags_element: any;
  // Riferimento all'elemento DOM di "treeText" utilizzato per accedere e manipolare l'elemento dell'albero nel template HTML.
  @ViewChild('treeText') treeText: any;
  // Riferimento al componente ContextMenuComponent per utilizzare il menu contestuale all'interno del componente.
  @ViewChild(ContextMenuComponent) public basicMenu: ContextMenuComponent;

  // Ascoltatore di eventi che cattura i click sul documento. Utilizzato per gestire il comportamento quando si clicca fuori dall'input di rinomina di un nodo.
  @HostListener('document:click', ['$event'])
  clickout(event: MouseEvent) {
    // Verifica se l'input di rinomina del nodo esiste
    if (this.renameNode_input != undefined) {
      // Se il click avviene sull'elemento di input di rinomina, ferma la propagazione dell'evento per evitare comportamenti indesiderati.
      if (this.renameNode_input.nativeElement.contains(event.target)) {
        event.stopPropagation();
      } else {
        // Se il click avviene fuori dall'input di rinomina, nasconde il tooltip e resetta la modalità di rinomina del nodo dopo un breve ritardo.
        var that = this;

        setTimeout(() => {
          //@ts-ignore
          $('.input-tooltip').tooltip('hide'); // Nasconde il tooltip con un selettore jQuery, ignorando i controlli di tipizzazione di TypeScript.
          setTimeout(() => {
            // Cerca nel modello dell'albero e resetta la modalità di rinomina per tutti i nodi.
            that.treeText.treeModel.getNodeBy((item) => {
              item.data.rename_mode = false;
            });
          }, 100);
        }, 300);
      }
    }
  }

  show = false;
  nodes = [];

  renameNodeSelected: any;
  validName = null;
  searchIconSpinner = false;
  searchIconSpinner_input = false;
  selectedFileToCopy: any;
  selectedFileToCopyArray: any;
  selectedNodeId;
  selectedEpidocId;

  storeTempRemoveFile_data: any;

  memoryMetadata = [];
  metadataForm = new FormGroup({
    element_id: new FormControl(null),
    metadata_array: new FormArray([], [Validators.required]),
  });

  metadata_array: FormArray;
  metadata_search: FormArray;
  destroy$: Subject<boolean> = new Subject();

  options: ITreeOptions = {
    actionMapping,
    allowDrag: (node) => node.isLeaf,
    allowDrop: (element, { parent, index }) => {
      // return true / false based on element, to.parent, to.index. e.g.
      //console.log(element, parent, index, parent.data.type == 'folder')
      return parent.data.type == 'directory' || parent.data.virtual;
    },
    getNodeClone: (node) => ({
      ...node.data,
      id: v4(),
      name: `copy of ${node.data.name}`,
    }),
  };

  newFile_nodes: any;
  newFile_options: any;
  tempNewFilename: any;
  tempNewFilePathId: any;

  @ViewChild('uploadFile') uploadFile_input: ElementRef;
  @ViewChild('updateFileMetadata') updateFileMetadata_input: ElementRef;
  @ViewChild('renameNodeInput') renameNode_input: ElementRef;
  @ViewChild('editMetadata', { static: false })
  editMetadataModal: ModalComponent;

  date = this.datePipe.transform(new Date(), 'yyyy-MM-ddThh:mm');
  counter = 0;

  textFilterForm = new FormGroup({
    search_text: new FormControl(null),
    search_mode: new FormControl(null),
    import_date: new FormControl(this.date),
    date_mode: new FormControl(''),
  });

  initialValues;
  author: string | undefined;
  userId: any;

  constructor(
    private lexicalService: LexicalEntriesService,
    private annotatorService: AnnotatorService,
    private expander: ExpanderService,
    private element: ElementRef,
    private documentService: DocumentSystemService,
    private renderer: Renderer2,
    private formBuilder: FormBuilder,
    private datePipe: DatePipe,
    private toastr: ToastrService,
    private authService: AuthService
  ) {}

  // Metodo chiamato all'inizializzazione del componente
  ngOnInit(): void {
    this.loadTree(); // Carica la struttura ad albero

    // Inizializza il form per il filtro di testo con gruppi e controlli form specifici
    this.textFilterForm = this.formBuilder.group({
      search_text: new FormControl(null), // Campo di testo per la ricerca
      search_mode: new FormControl('start'), // Modalità di ricerca (default: 'start')
      import_date: new FormControl(this.date), // Data di importazione per il filtro
      date_mode: new FormControl('until'), // Modalità di data (default: 'until')
      metadata_array: new FormArray([]), // Array di metadata per il filtro
    });

    // Tenta di recuperare il nome dell'utente autenticato
    try {
      this.author = this.authService.getUsername();
    } catch (error) {
      console.error('Error on getting username: ', error);
    }

    // Tenta di recuperare l'ID dell'utente autenticato
    try {
      this.userId = this.authService.getLoggedUser()['sub'];
    } catch (e) {
      console.error("Can't get user id", e);
    }

    this.onChanges(); // Imposta la sottoscrizione ai cambiamenti del form di ricerca

    // Inizializza il form per i metadata con gruppi e controlli form specifici
    this.metadataForm = this.formBuilder.group({
      element_id: new FormControl(null), // ID dell'elemento
      name: new FormControl(null), // Nome dell'elemento
      metadata_array: new FormArray([], [Validators.required]), // Array di metadata, obbligatorio
    });

    this.initialValues = this.textFilterForm.value; // Salva i valori iniziali del form di ricerca
  }

  // Imposta la logica di sottoscrizione ai cambiamenti nel form di filtro di testo
  onChanges() {
    this.textFilterForm.valueChanges
      .pipe(
        debounceTime(500), // Attende 500ms prima di emettere l'ultimo valore
        takeUntil(this.destroy$) // Prende i valori fino alla distruzione del componente
      )
      .subscribe((searchParams) => {
        console.log(searchParams); // Logga i parametri di ricerca
        this.searchFilter(searchParams); // Avvia la ricerca con i nuovi parametri
      });
  }

  // Seleziona un nodo temporaneo nell'albero
  selectTempNode(evt) {
    console.log(evt); // Logga l'evento
    let elementId;

    // Assegna l'ID dell'elemento basandosi sul nodo selezionato, se esiste
    if (evt.node.data['element-id']) {
      elementId = evt.node.data['element-id'];
    } else {
      elementId = 0; // Default se l'ID non è presente
    }

    this.tempNewFilePathId = elementId; // Salva l'ID del percorso del file temporaneo
  }

  /**
   * Funzione che gestisce gli eventi generati dall'interfaccia grafica.
   * @param $event L'evento generato.
   */
  onEvent = ($event: any) => {
    console.log($event);

    // Controlla se l'evento è di attivazione e se il nodo selezionato non è una directory
    // e se l'ID del nodo selezionato è diverso dall'ID dell'elemento selezionato precedentemente.
    if (
      $event.eventName == 'activate' &&
      $event.node.data.type != 'directory' &&
      this.selectedNodeId != $event.node.data['element-id']
    ) {
      // Imposta l'ID del nodo selezionato e l'ID dell'epidoc selezionato.
      this.selectedNodeId = $event.node.data['element-id'];
      this.selectedEpidocId = $event.node.data.metadata.itAnt_ID;
      //@ts-ignore
      $('#epigraphyTabModal').modal('show');
      $('.modal-backdrop').appendTo('.epigraphy-tab-body');
      //@ts-ignore
      $('#epigraphyTabModal').modal({ backdrop: 'static', keyboard: false });
      $('body').removeClass('modal-open');
      $('body').css('padding-right', '');

      // Invia al pannello di attestazione un valore nullo e disattiva il pannello di attestazione.
      this.lexicalService.sendToAttestationPanel(null);
      this.lexicalService.triggerAttestationPanel(false);

      // Se l'ID dell'epidoc selezionato è non definito, imposta l'ID dell'epidoc selezionato come il nome del nodo selezionato o come 'Unnamed'.
      if (this.selectedEpidocId == undefined) {
        if ($event.node.data.name != undefined || $event.node.data.name != '') {
          this.selectedEpidocId = $event.node.data.name;
        } else {
          this.selectedEpidocId = 'Unnamed';
        }
      }

      // Recupera il contenuto del nodo selezionato.
      this.documentService
        .getContent(this.selectedNodeId)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            let text = data.text;
            let object = {
              xmlString: text,
            };

            // Analizza il testo XML.
            let xmlDom = new DOMParser().parseFromString(text, 'text/xml');

            // Recupera i token associati al nodo selezionato.
            this.annotatorService
              .getTokens(this.selectedNodeId)
              .pipe(takeUntil(this.destroy$))
              .subscribe(
                (data) => {
                  console.log(data);
                  let element_id = this.selectedNodeId;
                  let tokens = data.tokens;

                  // Invia al pannello epigrafico i token, l'ID dell'elemento, l'ID dell'epidoc, il documento XML e l'ID del file.
                  this.documentService.sendToEpigraphyTab({
                    tokens: tokens,
                    element_id: element_id,
                    epidoc_id: this.selectedEpidocId,
                    xmlDoc: xmlDom,
                    fileId: this.selectedEpidocId,
                  });

                  // Espande e apre il pannello epigrafico se non è aperto né espanso, oppure lo apre se il pannello di modifica è aperto.
                  if (
                    !this.expander.isEditTabOpen() &&
                    !this.expander.isEpigraphyTabOpen()
                  ) {
                    if (
                      !this.expander.isEditTabExpanded() &&
                      !this.expander.isEpigraphyTabExpanded()
                    ) {
                      this.expander.expandCollapseEpigraphy(true);
                      this.expander.openCollapseEpigraphy(true);
                    }
                  } else if (
                    this.expander.isEditTabOpen() &&
                    !this.expander.isEpigraphyTabOpen()
                  ) {
                    if (
                      this.expander.isEditTabExpanded() &&
                      !this.expander.isEpigraphyTabExpanded()
                    ) {
                      this.expander.openCollapseEpigraphy(true);
                      this.expander.expandCollapseEdit(false);
                    }
                  }

                  // Invia i metadati al pannello dei metadati se sono presenti più di 5 metadati, altrimenti disattiva il pannello dei metadati.
                  let metadata = $event.node.data.metadata;
                  metadata['path'] = $event.node.data.path;
                  metadata['element-id'] = $event.node.data['element-id'];
                  if (
                    metadata != undefined &&
                    Object.keys(metadata).length > 5
                  ) {
                    this.documentService.sendToMetadataPanel(metadata);
                    this.documentService.triggerMetadataPanel(true);
                  } else {
                    this.documentService.sendToMetadataPanel(null);
                    this.documentService.triggerMetadataPanel(false);
                  }
                },
                (error) => {
                  console.log(error);
                }
              );

            // Invia un valore nullo al pannello epigrafico per il testo in formato Leiden.
            this.documentService.sendLeidenToEpigraphyTab(null);
            this.annotatorService.getIdText(this.selectedEpidocId);
            this.documentService
              .testConvert(object)
              .pipe(takeUntil(this.destroy$))
              .subscribe(
                (data) => {
                  if (data != undefined) {
                    try {
                      let raw = data.xml;
                      let HTML = new DOMParser().parseFromString(
                        raw,
                        'text/html'
                      );
                      console.log(HTML);

                      // Estrae le linee in formato Leiden dal testo HTML.
                      let domNodes = new DOMParser()
                        .parseFromString(raw, 'text/html')
                        .querySelectorAll('#edition #edition .textpart');
                      let childNodes = [];
                      if (Array.from(domNodes).length > 1) {
                        Array.from(domNodes).forEach((childNode) => {
                          Array.from(childNode.childNodes).forEach(
                            (subChild) => {
                              Array.from(subChild.childNodes).forEach((x) => {
                                childNodes.push(x);
                              });
                            }
                          );
                        });
                      } else {
                        childNodes = Array.from(
                          new DOMParser()
                            .parseFromString(raw, 'text/html')
                            .querySelectorAll('#edition .textpart')[0]
                            .childNodes[0].childNodes
                        );
                      }

                      let leidenLines = [];

                      // Ciclo per estrarre le linee di testo in formato Leiden.
                      for (var i = 0; i < childNodes.length; i++) {
                        let node = childNodes[i];

                        if (node.nodeName == 'A' || node.nodeName == 'BR') {
                          let string = '';
                          for (var j = i; j < childNodes.length; j++) {
                            let textNode = childNodes[j];

                            if (
                              textNode.nodeName == '#text' &&
                              textNode.nodeValue.trim() != ''
                            ) {
                              string += textNode.nodeValue;

                              if (j == childNodes.length - 1) {
                                leidenLines.push(string);
                                break;
                              }
                            } else if (
                              textNode.nodeName == 'SPAN' &&
                              textNode.innerText.trim() != '' &&
                              textNode.className != 'linenumber'
                            ) {
                              string += textNode.innerText;

                              if (j == childNodes.length - 1) {
                                leidenLines.push(string);
                                break;
                              }
                            } else if (
                              (textNode.nodeName == 'BR' ||
                                textNode?.id?.toLowerCase().includes('face') ||
                                textNode?.id?.toLowerCase().includes('text')) &&
                              i != j
                            ) {
                              leidenLines.push(string);

                              i = j - 1;
                              break;
                            }

                            if (j == childNodes.length - 1 && string != '') {
                              leidenLines.push(string);
                              break;
                            }
                          }
                        }
                      }

                      // Invia le linee in formato Leiden al pannello epigrafico.
                      this.documentService.sendLeidenToEpigraphyTab(
                        leidenLines
                      );

                      let translations = new DOMParser()
                        .parseFromString(raw, 'text/html')
                        .querySelectorAll('#translation');
                      let translationArray = [];
                      translations.forEach((element) => {
                        let childNodes = element.childNodes;
                        let string = '';
                        childNodes.forEach((child: any) => {
                          if (child.nodeName == 'P') {
                            string += child.innerHTML;
                          }
                        });
                        translationArray.push(string);
                      });

                      // Invia le traduzioni al pannello epigrafico.
                      this.documentService.sendTranslationToEpigraphyTab(
                        translationArray
                      );
                      this.annotatorService.getIdText(this.selectedEpidocId);
                    } catch (error) {
                      console.log(error);
                    }
                  }
                },
                (error) => {
                  console.log('ERROR TEST', error);
                  // Invia un valore nullo al pannello epigrafico in caso di errore.
                  this.documentService.sendLeidenToEpigraphyTab(null);
                  this.documentService.sendTranslationToEpigraphyTab(null);
                }
              );
          },
          (error) => {
            console.log(error);
          }
        );
    }
  };

  // Funzione chiamata quando si sposta un nodo all'interno dell'albero
  onMoveNode($event) {
    console.log($event);
    let node_type = $event.node.type;
    let target_type = $event.to.parent.type;
    // Controlla se il nodo è una directory e se il target è una directory o una cartella virtuale, quindi chiama la funzione moveFolder
    if (
      node_type === 'directory' &&
      (target_type === 'directory' || $event.to.parent.virtual)
    ) {
      this.moveFolder($event);
    } else if (
      node_type === 'file' &&
      (target_type === 'directory' || $event.to.parent.virtual)
    ) {
      // Se il nodo è un file e il target è una directory o una cartella virtuale, chiama la funzione moveFile
      this.moveFile($event);
    }
  }

  // Carica l'albero dei documenti
  loadTree() {
    this.documentService
      .getDocumentSystem()
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (data) => {
          console.log(data);
          // Controlla se ci sono dati nel sistema di documenti
          if (data['documentSystem'].length != 0) {
            // Ordina i dati dell'albero in base all'ID Ant
            data['documentSystem'] = data['documentSystem'].sort((a, b) => {
              const aKey =
                Object.keys(a.metadata).length === 0
                  ? a.name
                  : a.metadata.itAnt_ID;
              const bKey =
                Object.keys(b.metadata).length === 0
                  ? b.name
                  : b.metadata.itAnt_ID;
              return aKey.localeCompare(bKey);
            });
            // Aggiorna i nodi dell'albero e imposta un timeout per il cambio di modalità di rinomina
            this.nodes = data['documentSystem'];
            this.treeText.treeModel.update();
            this.loadModalTreeData.emit(this.nodes);
            setTimeout(() => {
              this.treeText.treeModel.getNodeBy((item) => {
                item.data.rename_mode = false;
              });
            }, 100);
          }
          // Aggiorna il contatore dei risultati
          this.counter = data['results'];
        },
        (error) => {
          console.log(error);
        }
      );
  }

  // Verifica se l'elemento è una cartella
  isFolder = (item: any): boolean => {
    if (item.type != undefined) {
      return (
        item.type == 'directory' &&
        (this.treeText.treeModel.activeNodes.length == 1 ||
          this.treeText.treeModel.activeNodes.length == 0)
      );
    } else {
      return false;
    }
  };

  // Verifica se l'elemento è un file
  isFile = (item: any): boolean => {
    if (item.type != undefined) {
      return (
        item.type == 'file' &&
        (this.treeText.treeModel.activeNodes.length == 1 ||
          this.treeText.treeModel.activeNodes.length == 0)
      );
    } else {
      return false;
    }
  };

  // Abilita la visualizzazione dei metadati per l'elemento selezionato
  enableMetadata = (item: any): boolean => {
    return (
      (item.type == 'file' || item.type == 'folder') &&
      (this.treeText.treeModel.activeNodes.length == 1 ||
        this.treeText.treeModel.activeNodes.length == 0)
    );
  };

  // Verifica se sono selezionati più elementi
  multipleSelection = (item: any): boolean => {
    //console.log(this.treeText.treeModel.activeNodes)
    return this.treeText.treeModel.activeNodes.length > 1;
  };

  // Verifica se l'elemento non è la radice
  noRoot(item: any) {
    return item.name != 'root';
  }

  // Verifica se è selezionata una cartella con più elementi per copia
  isFolderMultiple = (item: any): boolean => {
    if (this.selectedFileToCopyArray != undefined) {
      return (
        item.type == 'directory' && this.selectedFileToCopyArray.length > 1
      );
    } else {
      return false;
    }
  };

  // Verifica se è necessaria la richiesta per incollare gli elementi
  pasteElementsReq = (item: any): boolean => {
    if (this.selectedFileToCopyArray != undefined) {
      return this.selectedFileToCopyArray.length > 1;
    } else {
      return false;
    }
  };

  /**
   * Funzione che incolla gli elementi selezionati nella posizione specificata.
   * @param item Oggetto contenente l'ID dell'elemento di destinazione.
   */
  pasteElements(item) {
    // Stampa l'elemento ricevuto come parametro
    console.log(item);
    // Recupera l'ID dell'elemento di destinazione
    let target_element_id = item['element-id'];
    // Verifica se esistono elementi selezionati da copiare
    if (this.selectedFileToCopyArray != undefined) {
      // Itera su ogni elemento selezionato da copiare
      this.selectedFileToCopyArray.forEach((element) => {
        // Verifica se l'elemento è un file
        if (element.data.type == 'file') {
          // Costruisce i parametri per la richiesta di copia del file
          let parameters = {
            requestUUID: 'string',
            'user-id': this.userId,
            'element-id': element?.data['element-id'],
            'target-id': target_element_id,
          };
          // Effettua la chiamata al servizio per copiare il file
          this.documentService
            .copyFileTo(parameters)
            .pipe(takeUntil(this.destroy$))
            .subscribe(
              (data) => {
                // Stampa la risposta ricevuta dal servizio
                console.log(data);
                // Mostra una notifica di successo
                this.toastr.info(
                  'File ' + element?.data?.name + ' copied',
                  '',
                  {
                    timeOut: 5000,
                  }
                );
                // Espande il nodo di destinazione
                this.treeText.treeModel.getNodeBy((x) => {
                  if (x.data['element-id'] === target_element_id) {
                    console.log('entrato');
                    x.expand();

                    // Aggiunge il nodo copiato come figlio del nodo di destinazione
                    let node = {
                      children: element?.data.children,
                      'element-id': element?.data['element-id'] + 123213,
                      id: element?.data?.id + 1232312,
                      metadata: element?.data?.metadata,
                      name: element?.data?.name,
                      path: element?.data?.path,
                      rename_mode: false,
                      type: element?.data?.type,
                    };

                    x.data.children.push(node);
                    setTimeout(() => {
                      // Aggiorna la vista dell'albero
                      this.counter = this.nodes.length;
                      this.updateTreeView();
                      this.treeText.treeModel.update();
                    }, 100);
                  }
                });

                this.treeText.treeModel.update();

                // Cancella la selezione degli elementi da copiare
                this.selectedFileToCopyArray = null;
              },
              (error) => {
                // Gestisce gli errori
                this.selectedFileToCopyArray = null;
              }
            );
        } else {
          // Mostra una notifica di errore se viene selezionata una cartella
          this.toastr.error(
            "You can't copy folder, please select only files or move entire folder",
            'Error',
            {
              timeOut: 5000,
            }
          );
        }
      });
    }
  }

  /**
   * Funzione che imposta gli elementi da copiare.
   */
  copyElements() {
    // Resetta l'elemento selezionato per la copia
    this.selectedFileToCopy = null;
    // Imposta gli elementi da copiare con quelli attualmente selezionati nell'albero
    this.selectedFileToCopyArray = this.treeText.treeModel.activeNodes;
  }

  /**
   * Funzione che rimuove gli elementi selezionati.
   */
  removeElements() {
    // Ottiene gli elementi selezionati
    let selected_elements = Array.from(this.treeText.treeModel.activeNodes);
    // Itera su ogni elemento selezionato
    selected_elements.forEach((elements: any) => {
      try {
        // Ottiene i dati dell'elemento
        let data_node = elements.data;
        // Costruisce i parametri per la richiesta di rimozione
        let parameters = {
          requestUUID: 'string',
          'user-id': this.userId,
          'element-id': data_node['element-id'],
        };

        // Verifica se l'elemento è un file
        if (data_node.type == 'file') {
          // Effettua la chiamata al servizio per rimuovere il file
          this.documentService
            .removeFile(parameters)
            .pipe(takeUntil(this.destroy$))
            .subscribe(
              (data) => {
                // Stampa la risposta ricevuta dal servizio
                console.log(data);
                // Mostra una notifica di successo
                this.toastr.info('File ' + data_node.name + ' deleted', '', {
                  timeOut: 5000,
                });

                // Aggiorna le viste correlate alla rimozione del file
                this.lexicalService.sendToAttestationPanel(null);
                this.documentService.sendToEpigraphyTab(null);
                this.expander.expandCollapseEpigraphy(false);
                this.expander.openCollapseEpigraphy(false);

                if (this.expander.isEditOpen) {
                  this.expander.expandCollapseEdit(true);
                }

                this.documentService.sendToMetadataPanel(null);

                // Rimuove l'elemento dall'albero
                this.treeText.treeModel.getNodeBy((x) => {
                  if (x.data['element-id'] === data_node['element-id']) {
                    x.parent.data.children.splice(
                      x.parent.data.children.indexOf(x.data),
                      1
                    );
                  }
                });

                // Aggiorna la vista dell'albero
                this.treeText.treeModel.update();

                setTimeout(() => {
                  console.log(this.nodes);
                  this.counter = this.nodes.length;
                }, 100);
              },
              (error) => {
                // Gestisce gli errori
                console.log(error);
                if (typeof error.error == 'string') {
                  this.toastr.info(error.error, '', {
                    timeOut: 5000,
                  });
                }
              }
            );
        } else if (data_node.type == 'directory') {
          // Effettua la chiamata al servizio per rimuovere la cartella
          this.documentService
            .removeFolder(parameters)
            .pipe(takeUntil(this.destroy$))
            .subscribe(
              (data) => {
                // Stampa la risposta ricevuta dal servizio
                console.log(data);
                // Mostra una notifica di successo
                this.toastr.info(
                  'Folder ' + data_node.name + ' removed correctly',
                  'Info',
                  {
                    timeOut: 5000,
                  }
                );

                // Rimuove l'elemento dall'albero
                this.treeText.treeModel.getNodeBy((x) => {
                  if (x.data['element-id'] === data_node['element-id']) {
                    x.parent.data.children.splice(
                      x.parent.data.children.indexOf(x.data),
                      1
                    );
                  }
                });

                // Aggiorna la vista dell'albero
                this.treeText.treeModel.update();

                setTimeout(() => {
                  console.log(this.nodes);
                  this.counter = this.nodes.length;
                }, 100);
              },
              (error) => {
                // Gestisce gli errori
                console.log(error);
                this.toastr.error('Something went wront ', 'Error', {
                  timeOut: 5000,
                });
                if (typeof error.error == 'string') {
                  this.toastr.info(error.error, '', {
                    timeOut: 5000,
                  });
                }
              }
            );
        }
      } catch (error) {
        // Gestisce eventuali eccezioni
      }
    });
  }

  // Carica i dati temporanei dall'evento
  loadTempData(event) {
    this.tempNewFilePathId = event['element-id'];
  }

  // Crea un nuovo file vuoto
  createNewEmptyFile(name: string, pathId?: number) {
    let parameters = {};

    // Imposta i parametri in base alla presenza dell'ID del percorso
    if (pathId) {
      parameters = {
        requestUUID: 'string',
        'user-id': this.userId,
        'element-id': pathId,
        filename: name,
      };
    } else {
      parameters = {
        requestUUID: 'string',
        'user-id': this.userId,
        'element-id': this.tempNewFilePathId,
        filename: name,
      };
    }

    this.tempNewFilename = undefined;

    // Chiama il servizio per creare il file
    this.documentService
      .createFile(parameters)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (data) => {
          console.log(data);
          // Aggiorna la struttura ad albero con il nuovo file
          this.treeText.treeModel.getNodeBy((x) => {
            if (x.data['element-id'] === pathId) {
              x.expand();

              this.toastr.info('Nuovo file aggiunto', '', {
                timeOut: 5000,
              });
              console.log(x);
              x.data.children.push(data.node);
              setTimeout(() => {
                this.counter = this.nodes.length;
                this.updateTreeView();
                this.treeText.treeModel.update();
                this.treeText.treeModel
                  .getNodeById(data.node.id)
                  .setActiveAndVisible();
              }, 100);
            }
          });
        },
        (error) => {
          if (error.status != 200) {
            this.toastr.error(error.statusText, 'Errore', {
              timeOut: 5000,
            });
          }
          console.log(error);
        }
      );
  }

  // Aggiunge una cartella
  addFolder(evt) {
    if (evt != undefined) {
      let element_id = evt['element-id'];
      let parameters = {
        requestUUID: 'string',
        'user-id': this.userId,
        'element-id': element_id,
      };

      const expandedNodes = this.treeText.treeModel.expandedNodes;

      // Chiama il servizio per aggiungere una cartella
      this.documentService
        .addFolder(parameters)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            console.log(data);
            this.toastr.info('Nuova cartella aggiunta', '', {
              timeOut: 5000,
            });
            // Aggiorna la struttura ad albero con la nuova cartella
            this.treeText.treeModel.getNodeBy((x) => {
              if (x.data['element-id'] === element_id) {
                x.expand();

                let element_id_new_node = data.node['element-id'];
                let id_new_node = Math.floor(
                  Math.random() * (9728157429307 - 1728157429307) +
                    1728157429307
                );
                let new_node = {
                  children: [],
                  'element-id': element_id_new_node,
                  id: id_new_node,
                  metadata: {},
                  path: '',
                  name: data.node.name,
                  type: 'directory',
                  rename_mode: false,
                };
                console.log(x);
                x.data.children.push(new_node);

                setTimeout(() => {
                  this.updateTreeView();
                  this.treeText.treeModel.update();
                  this.treeText.treeModel
                    .getNodeById(id_new_node)
                    .setActiveAndVisible();
                }, 100);
              }
            });
          },
          (error) => {
            console.log(error);
          }
        );
    }
  }

  // Aggiunge un file
  addFile(evt) {
    console.log(evt);
    let element_id = this.uploadFile_input.nativeElement['element-id'];
    this.selectedFileToCopy = null;
    let file_name, parameters;

    if (evt.target.files != undefined) {
      if (evt.target.files.length == 1) {
        file_name = evt.target.files[0].name;
        parameters = {
          requestUUID: 'string',
          'user-id': this.userId,
          'element-id': element_id,
          'file-name': file_name,
        };
        const formData = new FormData();
        formData.append('file', evt.target.files[0]);
        // Chiama il servizio per caricare il file
        this.documentService
          .uploadFile(formData, element_id, 11)
          .pipe(takeUntil(this.destroy$))
          .subscribe(
            (data) => {
              console.log(data);
              let node = data.node;

              // Aggiorna la struttura ad albero con il nuovo file
              this.treeText.treeModel.getNodeBy((x) => {
                if (x.data['element-id'] === element_id) {
                  x.expand();

                  this.toastr.info('Nuovo file aggiunto', '', {
                    timeOut: 5000,
                  });
                  console.log(x);
                  x.data.children.push(data.node);
                  setTimeout(() => {
                    this.counter = this.nodes.length;
                    this.updateTreeView();
                    this.treeText.treeModel.update();
                    this.treeText.treeModel
                      .getNodeById(data.node.id)
                      .setActiveAndVisible();
                  }, 100);
                }
              });

              // Aggiorna i metadati del file
              if (this.author) {
                node['metadata']['uploader'] = this.author;
                let node_metadata = node['metadata'];

                let parameters = {
                  requestUUID: '11',
                  metadata: node_metadata,
                  'element-id': element_id,
                  'user-id': this.userId,
                };

                this.documentService
                  .updateMetadata(parameters)
                  .pipe(takeUntil(this.destroy$))
                  .subscribe(
                    (data) => {
                      console.log(data);
                    },
                    (error) => {
                      console.log(error);
                    }
                  );
              }
            },
            (error) => {
              console.log(error);
              if (error.status != 200) {
                if (error.error != undefined) {
                  this.toastr.error(
                    'Cambia il nome del file, ci sono alcuni file con lo stesso nome',
                    'Errore',
                    { timeOut: 5000 }
                  );
                }
              }
            }
          );
      } else {
        let files_array = evt.target.files;
        const uploadObservables = [];

        Array.from(files_array).forEach((element: any) => {
          const formData = new FormData();
          formData.append('file', element);

          const uploadObservable = this.documentService
            .uploadFile(formData, element_id, 12)
            .pipe(catchError((error) => of(null)));
          uploadObservables.push(uploadObservable);
        });

        // Carica più file in parallelo
        forkJoin(uploadObservables)
          .pipe(takeUntil(this.destroy$))
          .subscribe(
            (responses) => {
              responses.forEach((data: any, index) => {
                console.log(data);

                if (data) {
                  const element = files_array[index];

                  // Aggiorna la struttura ad albero con i nuovi file
                  this.treeText.treeModel.getNodeBy((x) => {
                    if (x.data['element-id'] === element_id) {
                      x.expand();
                      this.toastr.info('Nuovo file aggiunto', '', {
                        timeOut: 5000,
                      });
                      x.data.children.push(data.node);

                      setTimeout(() => {
                        this.counter = this.nodes.length;
                        this.updateTreeView();
                        this.treeText.treeModel.update();
                        this.treeText.treeModel
                          .getNodeById(data.node.id)
                          .setActiveAndVisible();
                      }, 100);
                    }
                  });
                } else {
                  this.toastr.error(
                    'Errore durante il caricamento di ' +
                      files_array[index].name,
                    '',
                    {
                      timeOut: 5000,
                    }
                  );
                }
              });
            },
            (error) => {
              console.log(error);
              this.toastr.error("Errore durante l'aggiunta di nuovi file", '', {
                timeOut: 5000,
              });
            }
          );
      }
    }

    //console.log(parameters)
    const expandedNodes = this.treeText.treeModel.expandedNodes;
  }

  /**
   * Gestisce l'aggiornamento dei metadati del file.
   *
   * @param evt Evento che scatena l'aggiornamento dei metadati del file.
   */
  updateFileMetadataHandler(evt): void {
    console.log(evt);
    let element_id = this.updateFileMetadata_input.nativeElement['element-id'];

    this.treeText.treeModel.getNodeBy((x) => {
      if (x.data['element-id'] === element_id) {
        element_id = x.data['element-id'];
      }
    });

    if (evt.target.files != undefined) {
      const formData = new FormData();
      formData.append('file', evt.target.files[0]);
      this.documentService
        .updateFileMetadata(formData, element_id, 11)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            console.log(data);
            let metadata = data.node.metadata;
            metadata['path'] = data.node.path;
            metadata['element-id'] = data.node['element-id'];
            if (metadata != undefined && Object.keys(metadata).length > 5) {
              this.documentService.sendToMetadataPanel(metadata);
              this.documentService.triggerMetadataPanel(true);
            } else {
              this.documentService.sendToMetadataPanel(null);
              this.documentService.triggerMetadataPanel(false);
            }
            this.toastr.info('Metadata file updated', 'Info', {
              timeOut: 5000,
            });
            this.treeText.treeModel.getNodeBy((x) => {
              if (
                x.data['element-id'] ===
                this.updateFileMetadata_input.nativeElement['element-id']
              ) {
                x.setActiveAndVisible();
              }
            });
          },
          (error) => {
            console.log(error);
            if (error.status != 200) {
              if (error.error != undefined) {
                this.toastr.error(
                  'Change the name of file, there are some files with the same name',
                  'Error',
                  { timeOut: 5000 }
                );
              }
            }
          }
        );
    }
  }

  /**
   * Attiva l'input nascosto per caricare un file.
   *
   * @param evt Evento che attiva l'input per il caricamento del file.
   */
  triggerUploader(evt): void {
    let element_id = evt['element-id'];
    this.renderer.setProperty(
      this.uploadFile_input.nativeElement,
      'element-id',
      element_id
    );
    this.uploadFile_input.nativeElement.click();
  }

  /**
   * Attiva l'input nascosto per aggiornare i metadati di un file.
   *
   * @param evt Evento che attiva l'input per l'aggiornamento dei metadati del file.
   */
  triggerFileMetadataUploader(evt): void {
    let element_id = evt['element-id'];
    this.renderer.setProperty(
      this.updateFileMetadata_input.nativeElement,
      'element-id',
      element_id
    );
    this.updateFileMetadata_input.nativeElement.click();
  }

  /**
   * Copia il file selezionato.
   *
   * @param evt Evento che indica il file da copiare.
   */
  copyFile(evt): void {
    console.log(evt);
    this.selectedFileToCopy = evt;
    this.selectedFileToCopyArray = null;
  }

  /**
   * Incolla il file copiato nella destinazione desiderata.
   *
   * @param evt Evento che indica il percorso di destinazione del file da incollare.
   */
  pasteFile(evt): void {
    console.log(evt);
    let element_id_target = evt['element-id'];
    let element_id_source = this.selectedFileToCopy['element-id'];
    let parameters = {
      requestUUID: 'string',
      'user-id': this.userId,
      'element-id': element_id_source,
      'target-id': element_id_target,
    };

    this.documentService
      .copyFileTo(parameters)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (data) => {
          console.log(data);
          this.toastr.info('File ' + evt['name'] + ' copied', '', {
            timeOut: 5000,
          });
          this.treeText.treeModel.getNodeBy((x) => {
            if (x.data['element-id'] === element_id_target) {
              console.log('entrato');
              x.expand();

              let node = {
                children: this.selectedFileToCopy.children,
                'element-id': this.selectedFileToCopy['element-id'],
                id: this.selectedFileToCopy.id + 1232312,
                metadata: this.selectedFileToCopy.metadata,
                name: this.selectedFileToCopy.name,
                path: '',
                rename_mode: false,
                type: this.selectedFileToCopy.type,
              };

              x.data.children.push(node);
              setTimeout(() => {
                this.counter = this.nodes.length;
                this.updateTreeView();
                this.treeText.treeModel.update();
                this.treeText.treeModel
                  .getNodeById(node.id)
                  .setActiveAndVisible();
              }, 100);
            }
          });

          this.treeText.treeModel.update();

          this.selectedFileToCopy = null;
        },
        (error) => {
          this.selectedFileToCopy = null;
        }
      );
  }

  // Questa funzione gestisce il download di un file dal server.
  downloadFile(evt: any) {
    console.log(evt);
    // Ottieni l'ID dell'elemento dal parametro 'evt'
    let element_id = evt['element-id'];
    // Crea i parametri per la richiesta di download
    let parameters = {
      requestUUID: 'string',
      'user-id': this.userId,
      'element-id': element_id,
    };

    // Effettua la richiesta di download al servizio documenti
    this.documentService
      .downloadFile(parameters)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (data) => {
          // Crea un Blob con i dati ricevuti
          const blob = new Blob([data], { type: 'application/xml' });
          // Crea un URL temporaneo per il Blob
          const url = window.URL.createObjectURL(blob);
          // Crea un elemento link per avviare il download
          const link = document.createElement('a');
          link.href = url;
          // Imposta il nome del file durante il download
          link.download = evt.name; // Cambia con il nome del file che preferisci
          // Aggiungi il link all'elemento body del documento
          document.body.appendChild(link);
          // Simula il click sul link per avviare il download
          link.click();
          // Rimuovi il link dall'elemento body
          document.body.removeChild(link);
          // Rilascia l'URL temporaneo creato
          window.URL.revokeObjectURL(url);
          // Logga i dati ricevuti dal server
          console.log(data);
          // Visualizza una notifica di successo per il download
          this.toastr.info('File ' + evt['name'] + ' scaricato', '', {
            timeOut: 5000,
          });
        },
        (error) => {
          // Gestisci eventuali errori durante il download
          // console.log(error)
        }
      );
  }

  // Questa funzione memorizza temporaneamente i dati del file da eliminare
  storeTempDeleteFile(evt: any) {
    this.storeTempRemoveFile_data = evt;
  }

  // Questa funzione cancella i dati temporanei del file da eliminare
  deleteTempData() {
    this.storeTempRemoveFile_data = null;
  }

  // Questa funzione rimuove il file dal server
  removeFile() {
    // Ottieni i dati del file da eliminare dalla memorizzazione temporanea
    let evt = this.storeTempRemoveFile_data;
    // Inizializza la variabile di selezione file a null
    this.selectedFileToCopy = null;
    // Cancella i dati temporanei del file
    this.storeTempRemoveFile_data = null;
    // Verifica se ci sono dati validi da eliminare
    if (evt != undefined) {
      // Ottieni l'ID dell'elemento da eliminare
      let element_id = evt['element-id'];
      // Crea i parametri per la richiesta di rimozione del file
      let parameters = {
        requestUUID: 'string',
        'user-id': this.userId,
        'element-id': element_id,
      };

      // Ottieni i nodi espansi nell'albero
      const expandedNodes = this.treeText.treeModel.expandedNodes;

      // Effettua la richiesta di rimozione del file al servizio documenti
      this.documentService
        .removeFile(parameters)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            // Logga i dati ricevuti dal server
            console.log(data);
            // Visualizza una notifica di successo per la rimozione del file
            this.toastr.info('File ' + evt['name'] + ' eliminato', '', {
              timeOut: 5000,
            });

            // Rimuovi il nodo dell'elemento eliminato dall'albero
            this.treeText.treeModel.getNodeBy((x) => {
              if (x.data['element-id'] === element_id) {
                x.parent.data.children.splice(
                  x.parent.data.children.indexOf(x.data),
                  1
                );
              }
            });

            // Aggiorna la visualizzazione dell'albero
            this.treeText.treeModel.update();

            // Aggiorna il contatore dei nodi nell'albero
            setTimeout(() => {
              console.log(this.nodes);
              this.counter = this.nodes.length;
            }, 100);
          },
          (error) => {
            // Gestisci eventuali errori durante la rimozione del file
            console.log(error);
            // Visualizza un messaggio di errore se presente
            if (typeof error.error == 'string') {
              this.toastr.info(error.error, '', {
                timeOut: 5000,
              });
            }
          }
        );
    }
  }

  // Questa funzione rimuove una cartella dal server
  removeFolder(evt: any) {
    // Verifica se ci sono dati validi della cartella da eliminare
    if (evt != undefined) {
      // Ottieni l'ID dell'elemento da eliminare
      let element_id = evt['element-id'];
      // Crea i parametri per la richiesta di rimozione della cartella
      let parameters = {
        requestUUID: 'string',
        'user-id': this.userId,
        'element-id': element_id,
      };
      // Visualizza una notifica di successo per la rimozione della cartella
      this.toastr.info('Cartella ' + evt['name'] + ' eliminata', '', {
        timeOut: 5000,
      });
      // Ottieni i nodi espansi nell'albero
      const expandedNodes = this.treeText.treeModel.expandedNodes;

      // Effettua la richiesta di rimozione della cartella al servizio documenti
      this.documentService
        .removeFolder(parameters)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            // Logga i dati ricevuti dal server
            console.log(data);

            // Rimuovi il nodo dell'elemento eliminato dall'albero
            this.treeText.treeModel.getNodeBy((x) => {
              if (x.data['element-id'] === element_id) {
                x.parent.data.children.splice(
                  x.parent.data.children.indexOf(x.data),
                  1
                );
              }
            });

            // Aggiorna la visualizzazione dell'albero
            this.treeText.treeModel.update();

            // Aggiorna il contatore dei nodi nell'albero
            setTimeout(() => {
              console.log(this.nodes);
              this.counter = this.nodes.length;
            }, 100);
          },
          (error) => {
            // Gestisci eventuali errori durante la rimozione della cartella
            console.log(error);
            // Visualizza un messaggio di errore se presente
            if (typeof error.error == 'string') {
              this.toastr.info(error.error, '', {
                timeOut: 5000,
              });
            }
          }
        );
    }
  }

  /**
   * Sposta una cartella nel nuovo percorso specificato.
   * @param evt L'evento che contiene le informazioni sulla cartella e sulla destinazione.
   */
  moveFolder(evt) {
    if (evt != undefined) {
      let element_id = evt.node['element-id'];
      let target_id = evt.to.parent['element-id'];
      if (target_id == undefined) {
        target_id = 1;
      }
      let parameters = {
        requestUUID: 'string',
        'user-id': this.userId,
        'element-id': element_id,
        'target-id': target_id,
      };

      // Effettua la richiesta di spostamento della cartella al servizio documentService
      this.documentService
        .moveFolder(parameters)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            this.toastr.info('Cartella ' + evt.node['name'] + ' spostata', '', {
              timeOut: 5000,
            });
          },
          (error) => {
            console.log(error);
          }
        );
    }
  }

  /**
   * Sposta un file nel nuovo percorso specificato.
   * @param evt L'evento che contiene le informazioni sul file e sulla destinazione.
   */
  moveFile(evt) {
    if (evt != undefined) {
      console.log(evt);
      let element_id = evt.node['element-id'];
      let target_id = evt.to.parent['element-id'];
      if (target_id == undefined) {
        target_id = 1;
      }
      let parameters = {
        requestUUID: 'string',
        'user-id': this.userId,
        'element-id': element_id,
        'target-id': target_id,
      };

      // Effettua la richiesta di spostamento del file al servizio documentService
      this.documentService
        .moveFileTo(parameters)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          (data) => {
            console.log(data);
            this.toastr.info('File ' + evt.node['name'] + ' spostato', '', {
              timeOut: 5000,
            });
          },
          (error) => {
            if (error.status != 200) {
              this.toastr.error(error.error.message, '', {
                timeOut: 5000,
              });
            }
            console.log(error);
          }
        );
    }
  }

  /**
   * Attiva la modalità di rinominazione di un nodo nell'albero.
   * @param evt L'evento che ha scatenato l'attivazione della modalità di rinominazione.
   */
  renameNode(evt) {
    setTimeout(() => {
      this.renameNode_input.nativeElement.focus();
      //@ts-ignore
      $('.input-tooltip').tooltip({
        trigger: 'hover',
      });
    }, 300);
    console.log(evt);

    this.treeText.treeModel.getNodeBy((node) => {
      if (node.data['element-id'] == evt['element-id']) {
        node.data.rename_mode = true;
      } else {
        node.data.rename_mode = false;
      }
    });
  }

  /**
   * Gestisce l'evento di rinominazione di un nodo.
   * @param evt L'evento di tastiera associato alla rinominazione.
   * @param node Il nodo da rinominare.
   * @param new_value Il nuovo valore del nodo.
   */
  onRenamingNode(evt, node, new_value) {
    console.log(evt, node);
    setTimeout(() => {
      //@ts-ignore
      $('.input-tooltip').tooltip({
        trigger: 'hover',
      });
    }, 300);
    switch (evt.key) {
      case 'Enter':
        this.updateNodeName(node, new_value);
        break;
      case 'Escape':
        this.exitRenamingMode();
        break;
      default:
        console.log(evt);
    }
  }

  /**
   * Aggiorna il nome del nodo della struttura ad albero.
   * @param node Il nodo della struttura ad albero da aggiornare.
   * @param new_value Il nuovo valore da assegnare al nome del nodo.
   */
  updateNodeName(node, new_value) {
    this.searchIconSpinner_input = true;
    let node_type = node.data.type;

    if (new_value.match(/^[A-Za-z-_0-9. ]{3,}$/)) {
      let element_id = node.data['element-id'];
      let parameters = {
        requestUUID: 'string',
        'user-id': this.userId,
        'element-id': element_id,
        'rename-string': new_value,
      };

      if (node_type == 'directory') {
        this.documentService
          .renameFolder(parameters)
          .pipe(takeUntil(this.destroy$))
          .subscribe(
            (data) => {
              //console.log(data);
              this.toastr.info('Folder ' + node.data.name + ' renamed', '', {
                timeOut: 5000,
              });
              setTimeout(() => {
                this.treeText.treeModel.getNodeBy((x) => {
                  if (x.data['element-id'] === element_id) {
                    x.data.name = new_value;
                  }
                });
              }, 300);
              this.searchIconSpinner_input = false;
              this.renameNode_input.nativeElement.value = '';
              var that = this;

              setTimeout(() => {
                //@ts-ignore
                $('.input-tooltip').tooltip('hide');
                setTimeout(() => {
                  that.treeText.treeModel.getNodeBy((item) => {
                    item.data.rename_mode = false;
                  });
                }, 100);
              }, 100);
            },
            (error) => {
              console.log(error);
              var that = this;

              setTimeout(() => {
                //@ts-ignore
                $('.input-tooltip').tooltip('hide');
                setTimeout(() => {
                  that.treeText.treeModel.getNodeBy((item) => {
                    item.data.rename_mode = false;
                  });
                }, 100);
              }, 100);
            }
          );
      } else if (node_type == 'file') {
        this.documentService
          .renameFile(parameters)
          .pipe(takeUntil(this.destroy$))
          .subscribe(
            (data) => {
              this.toastr.info('File renamed', '', {
                timeOut: 5000,
              });
              //console.log(data);
              setTimeout(() => {
                this.treeText.treeModel.getNodeBy((x) => {
                  if (x.data['element-id'] === element_id) {
                    x.data.name = new_value;
                  }
                });
              }, 300);
              this.searchIconSpinner_input = false;
              this.renameNode_input.nativeElement.value = '';
              var that = this;

              setTimeout(() => {
                //@ts-ignore
                $('.input-tooltip').tooltip('hide');
                setTimeout(() => {
                  that.treeText.treeModel.getNodeBy((item) => {
                    item.data.rename_mode = false;
                  });
                }, 100);
              }, 100);
            },
            (error) => {
              console.log(error);
              var that = this;

              setTimeout(() => {
                //@ts-ignore
                $('.input-tooltip').tooltip('hide');
                setTimeout(() => {
                  that.treeText.treeModel.getNodeBy((item) => {
                    item.data.rename_mode = false;
                  });
                }, 100);
              }, 100);
            }
          );
      }
    }
  }

  /**
   * Esce dalla modalità di rinomina del nodo.
   */
  exitRenamingMode() {
    var that = this;

    setTimeout(() => {
      //@ts-ignore
      $('.input-tooltip').tooltip('hide');
      setTimeout(() => {
        that.searchIconSpinner_input = false;
        that.treeText.treeModel.getNodeBy((item) => {
          item.data.rename_mode = false;
        });
      }, 100);
    }, 300);
  }

  /**
   * Salva i metadati aggiornati.
   */
  saveMetadata() {
    console.log(this.metadata_array.value);
    let element_id = this.metadataForm.get('element_id').value;
    let name = this.metadataForm.get('name').value;
    let parameters = {
      requestUUID: 'string',
      metadata: {},
      'user-id': this.userId,
      'element-id': element_id,
    };

    this.metadata_array.value.forEach((element) => {
      parameters.metadata[element.key] = element.value;
    });

    const expandedNodes = this.treeText.treeModel.expandedNodes;

    this.documentService
      .updateMetadata(parameters)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (data) => {
          this.toastr.info('Metadata updated for ' + name + ' node', '', {
            timeOut: 5000,
          });
          //console.log(data);
          this.nodes = data['documentSystem'];
          expandedNodes.forEach((node: TreeNode) => {
            setTimeout(() => {
              this.treeText.treeModel.getNodeBy((x) => {
                if (x.data['element-id'] === node.data['element-id']) {
                  x.setActiveAndVisible();
                }
              });
            }, 300);
          });
        },
        (error) => {
          console.log(error);
        }
      );
  }

  // Rimuove un elemento metadata dall'array e dal form
  removeMetadataItem(index) {
    this.metadata_array = this.metadataForm.get('metadata_array') as FormArray;
    let name = this.metadata_array.at(index).get('key').value;
    // Notifica l'utente della rimozione dell'elemento metadata
    this.toastr.info('Metadata eliminato per il nodo ' + name, '', {
      timeOut: 5000,
    });
    this.memoryMetadata.splice(index, 1);
    this.metadata_array.removeAt(index);
    this.metadataForm.markAsTouched();
  }

  // Aggiunge un nuovo elemento metadata all'array e al form
  addMetadata(k?, v?) {
    this.metadata_array = this.metadataForm.get('metadata_array') as FormArray;

    if (k == undefined) {
      this.metadata_array.push(this.createMetadataItem());
    } else {
      this.metadata_array.push(this.createMetadataItem(k, v));
    }
  }

  // Chiude la finestra modale di rimozione di metadata
  onCloseRemoveMetadata() {
    this.selectedFileToCopy = null;
  }

  // Cancella il metadata associato all'elemento selezionato
  deleteMetadata() {
    let element_id = this.selectedFileToCopy['element-id'];
    let name = this.selectedFileToCopy['name'];
    let parameters = {
      requestUUID: 'string',
      'user-id': this.userId,
      'element-id': element_id,
    };

    // Richiesta di cancellazione del metadata al servizio documentService
    const expandedNodes = this.treeText.treeModel.expandedNodes;

    this.documentService
      .deleteMetadata(parameters)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (data) => {
          this.toastr.info('Metadata eliminato per il nodo ' + name, '', {
            timeOut: 5000,
          });
          this.nodes = data['documentSystem'];
          expandedNodes.forEach((node: TreeNode) => {
            setTimeout(() => {
              this.treeText.treeModel.getNodeBy((x) => {
                if (x.data['element-id'] === node.data['element-id']) {
                  x.setActiveAndVisible();
                }
              });
            }, 300);
          });
        },
        (error) => {
          console.log(error);
        }
      );
  }

  // Chiude la finestra modale di editing metadata e resetta i campi del form
  onCloseModal() {
    this.metadataForm.markAsUntouched();
    this.metadata_array.clear();
    this.memoryMetadata = [];
  }

  // Popola il form di editing metadata con i valori dell'elemento selezionato
  populateMetadata(item: any) {
    let element_id = item['element-id'];
    let name = item['name'];
    this.metadataForm.get('name').setValue(name, { emitEvent: false });
    this.metadataForm
      .get('element_id')
      .setValue(element_id, { emitEvent: false });
    this.editMetadataModal.show();

    this.metadata_array = this.metadataForm.get('metadata_array') as FormArray;
    this.metadata_array.clear();
    this.memoryMetadata = [];

    // Se l'elemento ha metadata, li aggiunge al form
    if (Object.keys(item.metadata).length != 0) {
      for (const [key, value] of Object.entries(item.metadata)) {
        console.log(`${key}: ${value}`);
        this.addMetadata(key, value);
      }
    } else {
      null;
    }
  }

  // Crea un nuovo FormGroup per un elemento metadata
  createMetadataItem(k?, v?) {
    if (k != undefined) {
      return this.formBuilder.group({
        key: new FormControl(k, [Validators.required, Validators.minLength(0)]),
        value: new FormControl(v, [
          Validators.required,
          Validators.minLength(0),
        ]),
      });
    } else {
      return this.formBuilder.group({
        key: new FormControl('', [
          Validators.required,
          Validators.minLength(0),
          this.uniqueIdValidator.bind(this),
        ]),
        value: new FormControl('', [
          Validators.required,
          Validators.minLength(0),
        ]),
      });
    }
  }

  // Validatore per garantire l'unicità delle chiavi metadata
  uniqueIdValidator(control: FormControl) {
    if (control.value != '') {
      if (
        this.metadata_array.value.find((item) => item.key === control.value)
      ) {
        return { duplicate: true };
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  // Aggiorna la visualizzazione dell'albero dopo il reset
  updateTreeView() {
    setTimeout(() => {
      //@ts-ignore
      $('.input-tooltip').tooltip({
        trigger: 'hover',
      });
    }, 300);

    setTimeout(() => {
      this.treeText.sizeChanged();
      //@ts-ignore
      $('.lexical-tooltip').tooltip();
    }, 1000);
  }

  // Reimposta i campi del form di filtro testuale
  resetFields() {
    this.textFilterForm.reset(this.initialValues, { emitEvent: false });
    setTimeout(() => {
      this.loadTree();
      this.treeText.treeModel.update();
      this.updateTreeView();
    }, 500);
  }

  /**
   * Funzione per filtrare gli elementi sulla base di un nuovo parametro di ricerca.
   * @param newPar Il nuovo parametro di ricerca
   */
  searchFilter(newPar) {
    // Imposta un timeout per consentire il rendering degli elementi prima di eseguire lo scrolling
    setTimeout(() => {
      const viewPort_prova = this.element.nativeElement.querySelector(
        'tree-viewport'
      ) as HTMLElement;
      // Imposta lo scrollTop a 0 per far scorrere fino all'inizio della lista
      viewPort_prova.scrollTop = 0;
    }, 300);

    // Inizializza un array per i parametri di ricerca
    let parameters = [];

    // Imposta la visualizzazione dell'icona di caricamento
    this.searchIconSpinner = true;

    // Stampa i parametri di ricerca
    console.log(parameters);
  }

  /**
   * Funzione per aggiungere un tag con il nome specificato.
   * @param name Il nome del tag da aggiungere
   * @returns Un oggetto con il nome del tag e il flag tag impostato su true
   */
  addTagFn(name) {
    return { name: name, tag: true };
  }

  /**
   * Funzione per triggerare i metadati.
   * Stampa gli elementi selezionati all'interno del componente dei tag di metadati.
   */
  triggerMetadata() {
    console.log(this.metadata_tags_element.selectedItems);
  }

  /**
   * Funzione di distruttore della classe.
   * Completa il Subject per evitare memory leak.
   */
  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.complete();
  }
}
