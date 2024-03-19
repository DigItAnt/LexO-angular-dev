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
  OnDestroy,
  OnInit,
  Renderer2,
  ViewChild,
} from '@angular/core';
import { LexicalEntriesService } from 'src/app/services/lexical-entries/lexical-entries.service';
import { ToastrService } from 'ngx-toastr';
import { DocumentSystemService } from 'src/app/services/document-system/document-system.service';
import {
  IActionMapping,
  ITreeOptions,
  KEYS,
  TreeNode,
  TREE_ACTIONS,
} from '@circlon/angular-tree-component';
import { ExpanderService } from 'src/app/services/expander/expander.service';
import { saveAs as importedSaveAs } from 'file-saver';
import { Subject, Subscription } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';
import { ConceptService } from 'src/app/services/concept/concept.service';
import { AuthService } from 'src/app/services/auth/auth.service';
import { v4 } from 'uuid';

const actionMapping: IActionMapping = {
  mouse: {
    click: (tree, node, $event) => {
      TREE_ACTIONS.TOGGLE_ACTIVE(tree, node, $event);

      if (node.data.rename_mode) {
        $event.preventDefault();
      }
    },
    expanderClick: (tree, node, $event) => {
      if (node.data.rename_mode) {
        $event.preventDefault();
      } else {
        //console.log(node);
        TREE_ACTIONS.TOGGLE_EXPANDED(tree, node, $event);
      }
    },
  },
  keys: {
    [KEYS.ENTER]: (tree, node, $event) => alert(`This is ${node.data.name}`),
  },
};

@Component({
  selector: 'app-document-system-tree',
  templateUrl: './document-system-tree.component.html',
  styleUrls: ['./document-system-tree.component.scss'],
})
export class DocumentSystemTreeComponent implements OnInit, OnDestroy {
  switcher = false;
  switcherSkos = false;
  @ViewChild('lexTree') lexTree: any;
  @ViewChild('textTree') textTree: any;
  @ViewChild('conceptTree') conceptTree: any;
  @ViewChild('skosTree') skosTree: any;
  @ViewChild('accordion') accordion: ElementRef;
  destroy$: Subject<boolean> = new Subject();
  refresh_after_edit_subscription: Subscription;
  trigger_lex_tree_subscription: Subscription;

  newFile_nodes: any | undefined;
  newFile_options: any;
  tempNewFilename: string | undefined;
  tempNewFilePathId: number | undefined;

  options: ITreeOptions = {
    actionMapping,
    allowDrag: (node) => node.isLeaf,
    allowDrop: (element, { parent, index }) => {
      return parent.data.type == 'directory';
    },
    getNodeClone: (node) => ({
      ...node.data,
      id: v4(),
      name: `copy of ${node.data.name}`,
    }),
  };

  userId: any;
  author: string | undefined;
  constructor(
    private exp: ExpanderService,
    private lexicalService: LexicalEntriesService,
    private toastr: ToastrService,
    private authService: AuthService,
    private documentService: DocumentSystemService,
    private conceptService: ConceptService
  ) {}

  /**
   * Questo metodo viene chiamato quando il componente viene inizializzato.
   * Si sottoscrive agli eventi di aggiornamento e tenta di ottenere l'ID e l'username dell'utente loggato.
   * Gestisce anche la ricezione di nuovi dati per aggiornare l'albero lessicale.
   */
  ngOnInit(): void {
    // Sottoscrizione all'evento di aggiornamento dopo la modifica
    this.refresh_after_edit_subscription =
      this.lexicalService.refreshAfterEdit$.subscribe((data) => {
        this.refreshAfterEdit(data);
      });

    try {
      // Tentativo di ottenere l'ID dell'utente loggato
      this.userId = this.authService.getLoggedUser()['sub'];
    } catch (e) {
      console.error("Impossibile ottenere l'ID dell'utente", e);
    }

    try {
      // Tentativo di ottenere l'username dell'utente loggato
      this.author = this.authService.getUsername();
    } catch (error) {
      console.error("Errore durante il recupero dell'username:", error);
    }

    // Sottoscrizione all'evento di trigger per l'albero lessicale
    this.trigger_lex_tree_subscription =
      this.lexicalService.triggerLexicalEntryTree$.subscribe(
        (data: any) => {
          setTimeout(() => {
            if (data != null) {
              if (data.request) {
                // Aggiornamento dell'albero lessicale padre
                this.updateTreeParent();

                // Preparazione dei dati per richiedere l'aggiunta di un sottoelemento lessicale
                let lex = {
                  request: 'form',
                  lexicalEntry: data.data.lexicalEntry,
                };

                // Filtraggio delle voci lessicali
                this.lexTree.parameters['text'] = data.data.lexicalEntryLabel;
                this.lexTree.lexicalEntriesFilter(this.lexTree.parameters);

                // Aggiunta di una richiesta di sottovoce lessicale
                setTimeout(() => {
                  this.lexicalService.addSubElementRequest({
                    lex: lex,
                    data: data.data,
                  });
                }, 500);

                // Aggiornamento delle viste collapse per l'albero lessicale
                let a_link = this.accordion.nativeElement.querySelectorAll(
                  'button[data-target="#lexicalCollapse"]'
                );
                let collapse_container =
                  this.accordion.nativeElement.querySelectorAll(
                    'div[aria-labelledby="lexicalHeading"]'
                  );
                a_link.forEach((element) => {
                  if (element.classList.contains('collapsed')) {
                    element.classList.remove('collapsed');
                  } else {
                    // element.classList.add('collapsed')
                  }
                });

                collapse_container.forEach((element) => {
                  if (element.classList.contains('show')) {
                    // element.classList.remove('collapsed')
                  } else {
                    element.classList.add('show');
                  }
                });

                // Aggiornamento delle viste collapse per l'epigrafia
                let a_link_epigraphy =
                  this.accordion.nativeElement.querySelectorAll(
                    'button[data-target="#epigraphyCollapse"]'
                  );
                let collapse_container_epigraphy =
                  this.accordion.nativeElement.querySelectorAll(
                    'div[aria-labelledby="epigraphyHeading"]'
                  );
                a_link.forEach((element) => {
                  if (!element.classList.contains('collapse')) {
                    element.classList.add('collapsed');
                  }
                });

                collapse_container_epigraphy.forEach((element) => {
                  if (element.classList.contains('show')) {
                    element.classList.remove('show');
                  } else {
                    // element.classList.add('show')
                  }
                });
              } else {
                // Gestione della chiusura delle voci lessicali
                setTimeout(() => {
                  let a_link = this.accordion.nativeElement.querySelectorAll(
                    'a[data-target="#lexicalCollapse"]'
                  );
                  a_link.forEach((element) => {
                    element.classList.add('collapsed');
                  });

                  let collapse_container =
                    this.accordion.nativeElement.querySelectorAll(
                      'div[aria-labelledby="lexicalHeading"]'
                    );
                  collapse_container.forEach((element) => {
                    console.log(element);
                    if (element.classList.contains('show')) {
                      element.classList.remove('show');
                    }
                  });
                }, 100);
              }
            }
          }, 100);
        },
        (error) => {
          console.log(error);
        }
      );
  }

  /**
   * Aggiorna l'albero lessicale padre.
   */
  updateTreeParent() {
    this.lexTree.updateTreeView();
  }

  /**
   * Aggiorna l'albero lessicale padre (SKOS).
   */
  updateTreeParentSkos() {
    this.skosTree.updateTreeView();
  }

  /**
   * Cambia la visualizzazione delle etichette nell'albero lessicale (SKOS).
   */
  switchLabelSkos() {
    this.skosTree.labelView = !this.skosTree.labelView;
    this.skosTree.idView = !this.skosTree.idView;
    this.switcherSkos = !this.switcherSkos;
  }

  /**
   * Cambia la visualizzazione delle etichette nell'albero lessicale.
   */
  switchLabel() {
    this.lexTree.labelView = !this.lexTree.labelView;
    this.lexTree.idView = !this.lexTree.idView;
    this.switcher = !this.switcher;
  }

  /**
   * La funzione lexEdit gestisce la modifica dei dati lessicali.
   * @param {Object} data - I dati relativi alla modifica lessicale.
   */
  lexEdit(data) {
    var that = this;
    let instanceName = '';
    // Determina il nome dell'istanza da modificare
    if (
      data['lexicalEntry'] != undefined &&
      data['form'] == undefined &&
      data['sense'] == undefined
    ) {
      instanceName = data['lexicalEntry'];
    } else if (data['form'] != undefined) {
      instanceName = data['form'];
    } else if (data['sense'] != undefined) {
      instanceName = data['sense'];
    } else if (data['etymology'] != undefined) {
      instanceName = data['etymology'];
    }

    // Se è presente una nuova nota, aggiorna la nota corrispondente all'istanza specificata
    if (data['new_note'] != undefined) {
      setTimeout(() => {
        this.lexTree.lexicalEntryTree.treeModel.getNodeBy(function (x) {
          if (
            data['lexicalEntry'] != undefined &&
            data['form'] == undefined &&
            data['sense'] == undefined
          ) {
            if (x.data.lexicalEntry == instanceName) {
              x.data.note = data['new_note'];
              that.lexTree.lexicalEntryTree.treeModel.update();
              that.lexTree.updateTreeView();
              $('.note_' + x.data.id).attr(
                'data-original-title',
                data['new_note']
              );
              data['new_note'] = undefined;
              return true;
            } else {
              return false;
            }
          } else if (data['form'] != undefined) {
            if (x.data.form == instanceName) {
              x.data.note = data['new_note'];
              that.lexTree.lexicalEntryTree.treeModel.update();
              that.lexTree.updateTreeView();
              data['new_note'] = undefined;
              return true;
            } else {
              return false;
            }
          } else if (data['sense'] != undefined) {
            if (x.data.sense == instanceName) {
              x.data.note = data['new_note'];
              that.lexTree.lexicalEntryTree.treeModel.update();
              that.lexTree.updateTreeView();
              data['new_note'] = undefined;
              return true;
            } else {
              return false;
            }
          } else if (data['etymology'] != undefined) {
            if (x.data.etymology == instanceName) {
              x.data.note = data['new_note'];
              that.lexTree.lexicalEntryTree.treeModel.update();
              that.lexTree.updateTreeView();
              data['new_note'] = undefined;
              return true;
            } else {
              return false;
            }
          } else {
            return false;
          }
        });
      }, 500);
    } else if (data['new_label'] != undefined) {
      // Se è presente un nuovo label, aggiorna il label corrispondente all'istanza specificata
      let instanceName = '';
      if (data['lexicalEntry'] != undefined && data['form'] == undefined) {
        instanceName = data['lexicalEntry'];
      } else if (data['form'] != undefined) {
        instanceName = data['form'];
      } else if (data['sense'] != undefined) {
        instanceName = data['sense'];
      } else if (data['etymology'] != undefined) {
        instanceName = data['etymology'];
      } else if (data['conceptSet'] != undefined) {
        instanceName = data['conceptSet'];
      } else if (data['lexicalConcept'] != undefined) {
        instanceName = data['lexicalConcept'];
      }

      setTimeout(() => {
        if (
          data['conceptSet'] == undefined &&
          data['lexicalConcept'] == undefined
        ) {
          this.lexTree.lexicalEntryTree.treeModel.getNodeBy(function (x) {
            if (data['lexicalEntry'] != undefined) {
              if (x.data.lexicalEntry == instanceName) {
                x.data.label = data['new_label'];
                x.scrollIntoView();
                data['new_label'] = undefined;
                return true;
              } else {
                return false;
              }
            } else if (data['form'] != undefined) {
              if (x.data.form == instanceName) {
                x.data.label = data['new_label'];
                x.scrollIntoView();
                data['new_label'] = undefined;
                return true;
              } else {
                return false;
              }
            } else if (data['sense'] != undefined) {
              if (x.data.sense == instanceName) {
                x.data.label = data['new_label'];
                x.scrollIntoView();
                data['new_label'] = undefined;
                return true;
              } else {
                return false;
              }
            } else if (data['etymology'] != undefined) {
              if (x.data.etymology == instanceName) {
                x.data.label = data['new_label'];
                x.scrollIntoView();
                data['new_label'] = undefined;
                return true;
              } else {
                return false;
              }
            } else {
              return false;
            }
          });
        } else {
          this.skosTree.skosTree.treeModel.getNodeBy(function (x) {
            if (data['conceptSet'] != undefined) {
              if (x.data.conceptSet == instanceName) {
                x.data.defaultLabel = data['new_label'];
                x.scrollIntoView();
                data['new_label'] = undefined;
                return true;
              } else {
                return false;
              }
            } else if (data['lexicalConcept'] != undefined) {
              if (x.data.lexicalConcept == instanceName) {
                x.data.defaultLabel = data['new_label'];
                x.scrollIntoView();
                data['new_label'] = undefined;
                return true;
              } else {
                return false;
              }
            } else {
              return false;
            }
          });
        }
      }, 500);
    } else if (data['new_type'] != undefined) {
      // Se è presente un nuovo tipo, aggiorna il tipo corrispondente all'istanza specificata
      let instanceName = '';
      if (data['lexicalEntry'] != undefined) {
        instanceName = data['lexicalEntry'];
      } else if (data['form'] != undefined) {
        instanceName = data['form'];
      } else if (data['sense'] != undefined) {
        instanceName = data['sense'];
      }
      setTimeout(() => {
        this.lexTree.lexicalEntryTree.treeModel.getNodeBy(function (x) {
          if (data['lexicalEntry'] != undefined) {
            if (x.data.lexicalEntry == instanceName) {
              x.data.type = data['new_type'];
              x.scrollIntoView();
              data['new_type'] = undefined;
              return true;
            } else {
              return false;
            }
          } else if (data['form'] != undefined) {
            if (x.data.form == instanceName) {
              x.data.type = data['new_type'];
              x.scrollIntoView();
              data['new_type'] = undefined;
              return true;
            } else {
              return false;
            }
          } else if (data['sense'] != undefined) {
            if (x.data.seame == instanceName) {
              x.data.type = data['new_type'];
              x.scrollIntoView();
              data['new_type'] = undefined;
              return true;
            } else {
              return false;
            }
          } else {
            return false;
          }
        });
      }, 500);
    } else if (data['new_lang'] != undefined) {
      // Se è presente una nuova lingua, aggiorna la lingua corrispondente all'istanza specificata
      let instanceName = '';
      if (data['lexicalEntry'] != undefined) {
        instanceName = data['lexicalEntry'];
      } else if (data['form'] != undefined) {
        instanceName = data['form'];
      } else if (data['sense'] != undefined) {
        instanceName = data['sense'];
      }
      setTimeout(() => {
        this.lexTree.lexicalEntryTree.treeModel.getNodeBy(function (x) {
          if (data['lexicalEntry'] != undefined) {
            if (x.data.lexicalEntry == instanceName) {
              x.data.language = data['new_lang'];
              x.scrollIntoView();
              data['new_lang'] = undefined;
              return true;
            } else {
              return false;
            }
          } else if (data['form'] != undefined) {
            if (x.data.form == instanceName) {
              x.data.language = data['new_lang'];
              x.scrollIntoView();
              data['new_lang'] = undefined;
              return true;
            } else {
              return false;
            }
          } else if (data['sense'] != undefined) {
            if (x.data.seame == instanceName) {
              x.data.language = data['new_lang'];
              x.scrollIntoView();
              data['new_lang'] = undefined;
              return true;
            } else {
              return false;
            }
          } else {
            return false;
          }
        });
      }, 500);
    } else if (data['new_pos'] != undefined) {
      // Se è presente una nuova parte del discorso, aggiorna la parte del discorso corrispondente all'istanza specificata
      let instanceName = '';
      if (data['lexicalEntry'] != undefined) {
        instanceName = data['lexicalEntry'];
      } else if (data['form'] != undefined) {
        instanceName = data['form'];
      } else if (data['sense'] != undefined) {
        instanceName = data['sense'];
      }
      setTimeout(() => {
        this.lexTree.lexicalEntryTree.treeModel.getNodeBy(function (x) {
          if (data['lexicalEntry'] != undefined) {
            if (x.data.lexicalEntry == instanceName) {
              x.data.pos = data['new_pos'].split('#')[1];
              x.scrollIntoView();
              data['new_pos'] = undefined;
              return true;
            } else {
              return false;
            }
          } else if (data['form'] != undefined) {
            if (x.data.form == instanceName) {
              x.data.pos = data['new_pos'].split('#')[1];
              x.scrollIntoView();
              data['new_pos'] = undefined;
              return true;
            } else {
              return false;
            }
          } else if (data['sense'] != undefined) {
            if (x.data.sense == instanceName) {
              x.data.pos = data['new_pos'].split('#')[1];
              x.scrollIntoView();
              data['new_pos'] = undefined;
              return true;
            } else {
              return false;
            }
          } else {
            return false;
          }
        });
      }, 500);
    } else if (data['new_status'] != undefined) {
      // Se è presente un nuovo stato, aggiorna lo stato corrispondente all'istanza specificata
      setTimeout(() => {
        this.lexTree.lexicalEntryTree.treeModel.getNodeBy(function (x) {
          if (
            data['lexicalEntry'] != undefined &&
            data['form'] == undefined &&
            data['sense'] == undefined
          ) {
            if (x.data.lexicalEntry == instanceName) {
              x.data.status = data['new_status'];
              that.lexTree.lexicalEntryTree.treeModel.update();
              that.lexTree.updateTreeView();
              return true;
            } else {
              return false;
            }
          } else {
            return false;
          }
        });
      }, 500);
    }
  }

  /**
   * Metodo per cambiare la definizione di un senso.
   * @param data Oggetto contenente i dati per la modifica della definizione.
   */
  changeSenseDefinition(data: any): void {
    var that = this;
    setTimeout(() => {
      that.lexTree.lexicalEntryTree.treeModel.getNodeBy(function (x) {
        if (x.data.sense != undefined) {
          if (x.data.sense == data['sense']) {
            x.data.definition =
              data['new_definition'] != ''
                ? data['new_definition']
                : 'no definition';
            that.lexTree.lexicalEntryTree.treeModel.update();
            that.lexTree.updateTreeView();
            return true;
          } else {
            return false;
          }
        } else {
          return false;
        }
      });
    }, 500);
  }

  /**
   * Metodo per cambiare l'etichetta di una forma.
   * @param data Oggetto contenente i dati per la modifica dell'etichetta della forma.
   */
  changeFormLabel(data: any): void {
    var that = this;
    setTimeout(() => {
      this.lexTree.lexicalEntryTree.treeModel.getNodeBy(function (x) {
        if (x.data.form != undefined) {
          if (x.data.form == data['form']) {
            x.data.label = data['new_label'];
            that.lexTree.lexicalEntryTree.treeModel.update();
            that.lexTree.updateTreeView();
            return true;
          } else {
            return false;
          }
        } else {
          return false;
        }
      });
    }, 500);
  }

  /**
   * Metodo per cambiare il tipo di una forma.
   * @param data Oggetto contenente i dati per la modifica del tipo della forma.
   */
  changeFormType(data: any): void {
    var that = this;
    setTimeout(() => {
      this.lexTree.lexicalEntryTree.treeModel.getNodeBy(function (x) {
        if (x.data.form != undefined) {
          if (x.data.form == data['form']) {
            x.data.type = data['new_type'];
            that.lexTree.lexicalEntryTree.treeModel.update();
            that.lexTree.updateTreeView();
            return true;
          } else {
            return false;
          }
        } else {
          return false;
        }
      });
    }, 500);
  }

  /**
   * Metodo per aggiornare l'albero dopo la modifica.
   * @param data Oggetto contenente i dati relativi alla richiesta di modifica.
   */
  refreshAfterEdit(data: any): void {
    // 0 -> lexEdit: quando creo una nuova lexical entry
    // 3 -> quando devo cambiare solo la label di una forma
    // 5 -> quando devo cambiare il tipo di una forma
    // 6 -> quando devo cambiare definizione a un senso
    if (data != null) {
      setTimeout(() => {
        switch (data['request']) {
          case 0:
            this.lexEdit(data);
            break;
          case 3:
            this.changeFormLabel(data);
            break;
          case 5:
            this.changeFormType(data);
            break;
          case 6:
            this.changeSenseDefinition(data);
            break;
        }
      }, 100);
    }
  }

  /**
   * Metodo per triggerare il caricamento dell'albero lessicale.
   */
  triggerLoad(): void {
    this.lexicalService.refreshLangTable();
  }

  /**
   * Crea una nuova voce lessicale e aggiorna l'albero delle voci lessicali.
   */
  newLexicalEntry() {
    this.lexicalService
      .newLexicalEntry()
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (data) => {
          console.log(data);
          let newLexEntryLabel = data['label'];
          let parameters = this.lexTree.getParameters();
          this.lexTree.lexicalEntriesFilter(parameters);

          // Visualizza un messaggio di successo
          this.toastr.success(
            data['lexicalEntry'] + ' aggiunta correttamente',
            '',
            {
              timeOut: 5000,
            }
          );

          setTimeout(() => {
            // Aggiorna l'albero delle voci lessicali
            this.lexTree.lexicalEntryTree.treeModel.update();
            this.lexTree.updateTreeView();

            setTimeout(() => {
              // Seleziona e rendi visibile il nodo appena creato
              this.lexTree.lexicalEntryTree.treeModel.getNodeBy(function (x) {
                if (x.data.lexicalEntry == data['lexicalEntry']) {
                  x.setActiveAndVisible();
                  return true;
                } else {
                  return false;
                }
              });
            }, 500);
          }, 200);
        },
        (error) => {
          console.log(error);
          // Visualizza un messaggio di errore
          this.toastr.error(error.error, 'Errore', {
            timeOut: 5000,
          });
        }
      );
  }

  /**
   * Carica l'albero dei nodi nel modal.
   *
   * @param event L'evento che attiva la funzione.
   */
  loadModalTree(event) {
    if (event) {
      // Imposta le opzioni del nuovo file
      this.newFile_options = this.options;
      this.newFile_nodes = [];
      this.newFile_nodes.push({
        name: 'root',
        type: 'directory',
        children: [],
      });
      this.newFile_nodes[0].children = event.filter(
        (el) => el.type == 'directory'
      );
      //this.newFile_nodes = event.nodes.filter( el => el.type == 'directory');

      console.log();
    }
  }

  /**
   * Seleziona un nodo temporaneo.
   *
   * @param evt L'evento che attiva la funzione.
   */
  selectTempNode(evt) {
    console.log(evt);
    let elementId;

    if (evt.node.data['element-id']) {
      elementId = evt.node.data['element-id'];
    } else {
      elementId = 0;
    }

    this.tempNewFilePathId = elementId;
  }

  /**
   * Aggiunge un nuovo file vuoto.
   *
   * @param name Il nome del nuovo file.
   * @param pathId L'ID del percorso del nuovo file.
   */
  addNewEmptyFile(name: string, pathId?: number) {
    let element_id = 0;

    let parameters = {
      requestUUID: 'string',
      'user-id': this.userId,
      'element-id': pathId,
      filename: name,
    };

    this.documentService
      .createFile(parameters)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (data) => {
          console.log(data);

          // Visualizza un messaggio informativo
          this.toastr.info('Nuovo file aggiunto', '', {
            timeOut: 5000,
          });

          if (this.author) {
            data.node['metadata']['uploader'] = this.author;
            let node_metadata = data.node['metadata'];

            let parameters = {
              requestUUID: '11',
              metadata: node_metadata,
              'element-id': element_id,
              'user-id': this.userId,
            };

            // Aggiorna i metadati del nodo
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

          if (pathId == 0) {
            // Aggiungi il nuovo nodo all'albero dei file
            this.textTree.treeText.treeModel.virtualRoot.data.children.push(
              data.node
            );
            setTimeout(() => {
              this.textTree.counter = this.textTree.nodes.length;
              this.textTree.updateTreeView();
              this.textTree.treeText.treeModel.update();
              this.textTree.treeText.treeModel
                .getNodeById(data.node.id)
                .setActiveAndVisible();
            }, 100);
          } else {
            // Aggiungi il nuovo nodo al percorso specificato nell'albero dei file
            this.textTree.treeText.treeModel.getNodeBy((x) => {
              if (x.data['element-id'] === pathId) {
                x.expand();

                this.toastr.info('Nuovo file aggiunto', '', {
                  timeOut: 5000,
                });
                console.log(x);
                x.data.children.push(data.node);
                setTimeout(() => {
                  this.textTree.counter = this.textTree.nodes.length;
                  this.textTree.updateTreeView();
                  this.textTree.treeText.treeModel.update();
                  this.textTree.treeText.treeModel
                    .getNodeById(data.node.id)
                    .setActiveAndVisible();
                }, 100);
              }
            });
          }

          //this.textTree.treeText.treeModel.getNodeById(data.node.id).setActiveAndVisible();

          this.tempNewFilePathId = undefined;
          this.tempNewFilename = undefined;
        },
        (error) => {
          this.tempNewFilePathId = undefined;
          this.tempNewFilename = undefined;
          console.log(error);
        }
      );
  }

  /**
   * Funzione per aggiungere un nuovo file.
   *
   * @param evt Evento del file selezionato.
   */
  addNewFile(evt?): void {
    // Inizializzazione dell'ID dell'elemento
    let element_id = 1;
    // Stampa dei file selezionati dall'evento
    console.log(evt.target.files);
    let parameters, file_name;

    if (evt.target.files != undefined) {
      // Se è stato selezionato un solo file
      if (evt.target.files.length == 1) {
        // Ottenimento del nome del file
        file_name = evt.target.files[0].name;
        // Definizione dei parametri per la richiesta
        parameters = {
          requestUUID: 'string',
          'user-id': this.userId,
          'element-id': element_id,
          'file-name': file_name,
        };
        // Creazione di un oggetto FormData per l'invio del file
        const formData = new FormData();
        formData.append('file', evt.target.files[0]);

        // Upload del file
        this.documentService
          .uploadFile(formData, element_id, 11)
          .pipe(takeUntil(this.destroy$))
          .subscribe(
            (data) => {
              // Log del risultato dell'upload
              console.log(data);
              // Notifica di aggiunta del nuovo file
              this.toastr.info('Nuovo file aggiunto', '', {
                timeOut: 5000,
              });
              // Aggiornamento dell'albero dei file
              setTimeout(() => {
                this.textTree.treeText.treeModel.nodes.push(data.node);
                this.textTree.counter =
                  this.textTree.treeText.treeModel.nodes.length;
                this.textTree.treeText.treeModel.update();
                this.textTree.treeText.treeModel
                  .getNodeById(data.node.id)
                  .setActiveAndVisible();
              }, 500);
              // Aggiornamento dei metadati se l'autore è definito
              if (this.author) {
                data.node['metadata']['uploader'] = this.author;
                let node_metadata = data.node['metadata'];
                let parameters = {
                  requestUUID: '11',
                  metadata: node_metadata,
                  'element-id': data.node['element-id'],
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
              // Corpo della richiesta per l'aggiornamento dei metadati
              let updateMetadataBody = {
                requestUUID: '11',
              };
            },
            (error) => {
              // Gestione degli errori durante l'upload
              console.log(error);
              if (error.status != 200) {
                this.toastr.error(
                  "Errore durante l'aggiunta del nuovo file",
                  '',
                  {
                    timeOut: 5000,
                  }
                );
              }
            }
          );
      } else {
        // Se sono stati selezionati più file
        let files_array = Array.from(evt.target.files);
        files_array.forEach((element: any) => {
          // Ottenimento del nome del file
          file_name = element.name;
          // Definizione dei parametri per la richiesta
          parameters = {
            requestUUID: 'string',
            'user-id': this.userId,
            'element-id': element_id,
            'file-name': file_name,
          };
          // Creazione di un oggetto FormData per l'invio del file
          const formData = new FormData();
          formData.append('file', element);

          // Upload del file
          this.documentService
            .uploadFile(formData, element_id, 11)
            .pipe(takeUntil(this.destroy$))
            .subscribe(
              (data) => {
                // Log del risultato dell'upload
                console.log(data);
                // Notifica di aggiunta del nuovo file
                this.toastr.info('Nuovo file aggiunto', '', {
                  timeOut: 5000,
                });
                // Aggiornamento dei metadati se l'autore è definito
                if (this.author) {
                  data.node['metadata']['uploader'] = this.author;
                  let node_metadata = data.node['metadata'];
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
                // Aggiornamento dell'albero dei file
                setTimeout(() => {
                  this.textTree.treeText.treeModel.nodes.push(data.node);
                  this.textTree.counter =
                    this.textTree.treeText.treeModel.nodes.length;
                  this.textTree.treeText.treeModel.update();
                  this.textTree.treeText.treeModel
                    .getNodeById(data.node.id)
                    .setActiveAndVisible();
                }, 500);
              },
              (error) => {
                // Gestione degli errori durante l'upload
                console.log(error);
                this.toastr.error(error.error.message, '', {
                  timeOut: 5000,
                });
              }
            );
        });
      }
    }
    // Stampa dell'evento
    console.log(evt);
  }

  /**
   * Aggiunge una nuova cartella al documento.
   */
  addNewFolder() {
    let element_id = 0;
    let parameters = {
      requestUUID: 'string',
      'user-id': this.userId,
      'element-id': element_id,
    };

    // Chiamata al servizio per aggiungere una cartella
    this.documentService
      .addFolder(parameters)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (data) => {
          console.log(data);

          if (data.node != undefined) {
            // Notifica l'aggiunta della nuova cartella
            this.toastr.info('Nuova cartella aggiunta', '', {
              timeOut: 5000,
            });
            // Aggiunge la nuova cartella alla struttura ad albero
            this.textTree.nodes.push(data.node);
            this.textTree.updateTreeView();
            this.textTree.treeText.treeModel.update();
          }

          if (this.author) {
            // Aggiornamento dei metadati per la cartella aggiunta
            data.node['metadata']['uploader'] = this.author;
            let node_metadata = data.node['metadata'];

            let parameters = {
              requestUUID: '11',
              metadata: node_metadata,
              'element-id': element_id,
              'user-id': this.userId,
            };

            // Chiamata al servizio per aggiornare i metadati della cartella
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
          // Gestione degli errori durante l'aggiunta della cartella
          console.log(error);
          this.toastr.error(
            'Errore durante la creazione della nuova cartella',
            '',
            {
              timeOut: 5000,
            }
          );
        }
      );
  }

  /**
   * Esporta il lessico in un file di formato Turtle.
   */
  exportLexicon() {
    let parameters = {
      fileName: 'export',
      format: 'turtle',
      inferred: false,
    };

    // Chiamata al servizio per esportare il lessico
    this.lexicalService
      .exportLexicon(parameters)
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (data) => {
          console.log(data);
          // Creazione del file e download
          var blob = new Blob([data], { type: 'text/turtle' });
          importedSaveAs(blob, 'file_name.txt');
          // window.open(url);
        },
        (error) => {
          // Gestione degli errori durante l'esportazione del lessico
          console.log(error);
        }
      );
  }

  /**
   * Aggiunge un nuovo insieme di concetti.
   */
  addNewConceptSet() {
    this.conceptService
      .createNewConceptSet()
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (data) => {
          console.log(data);
          if (data != undefined) {
            // Notifica l'aggiunta del nuovo insieme di concetti
            this.toastr.info('Nuovo insieme di concetti aggiunto', '', {
              timeOut: 5000,
            });
            data['hasChildren'] = true;
            // Aggiunge il nuovo insieme di concetti alla struttura ad albero
            this.skosTree.nodes.push(data);
            this.skosTree.updateTreeView();
            this.skosTree.skosTree.treeModel.update();
            this.skosTree.skosTree.treeModel
              .getNodeById(data.id)
              .setActiveAndVisible();
          }
        },
        (error) => {
          // Gestione degli errori durante l'aggiunta del nuovo insieme di concetti
          console.log(error);
          this.toastr.error(
            'Errore durante la creazione di un nuovo insieme di concetti',
            '',
            {
              timeOut: 5000,
            }
          );
        }
      );
  }

  /**
   * Aggiunge un nuovo concetto lessicale.
   */
  addNewLexicalConcept() {
    this.conceptService
      .createNewLexicalConcept()
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (data) => {
          console.log(data);
          if (data != undefined) {
            // Notifica l'aggiunta del nuovo concetto lessicale
            this.toastr.info('Nuovo concetto lessicale aggiunto', '', {
              timeOut: 5000,
            });
            data['hasChildren'] = true;

            this.skosTree.skos_nodes.push(data);
            this.skosTree.updateTreeView();
            this.skosTree.skosTree.treeModel.update();

            setTimeout(() => {
              this.skosTree.skosTree.treeModel.getNodeBy((element) => {
                if (element.data.lexicalConcept == data.lexicalConcept) {
                  element.setActiveAndVisible();
                }
              });
            }, 300);
          }
        },
        (error) => {
          // Gestione degli errori durante l'aggiunta del nuovo concetto lessicale
          console.log(error);
          this.toastr.error(
            'Errore durante la creazione di un nuovo concetto lessicale',
            '',
            {
              timeOut: 5000,
            }
          );
        }
      );
  }

  /**
   * Operazioni da eseguire durante la distruzione del componente.
   */
  ngOnDestroy(): void {
    // Disiscrizione dagli observable
    this.refresh_after_edit_subscription.unsubscribe();
    this.trigger_lex_tree_subscription.unsubscribe();
    this.destroy$.next(true);
    this.destroy$.complete();
  }
}
