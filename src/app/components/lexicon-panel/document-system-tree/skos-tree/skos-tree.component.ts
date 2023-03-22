import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormControl, FormBuilder } from '@angular/forms';
import { IActionMapping, TREE_ACTIONS, KEYS, ITreeState, ITreeOptions, TreeModel, TreeNode } from '@circlon/angular-tree-component';
import { ContextMenuComponent } from 'ngx-contextmenu';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil, tap, timeout } from 'rxjs/operators';
import { ConceptService } from 'src/app/services/concept/concept.service';
import { ExpanderService } from 'src/app/services/expander/expander.service';
import { LexicalEntriesService } from 'src/app/services/lexical-entries/lexical-entries.service';
import { v4 } from 'uuid';

const actionMapping: IActionMapping = {
  mouse: {
    /* dblClick: (tree, node, $event) => {
      if (node.hasChildren) {
        TREE_ACTIONS.TOGGLE_EXPANDED(tree, node, $event);
      }
    }, */
    click: (tree, node, $event) => {
      $event.shiftKey
        ? TREE_ACTIONS.TOGGLE_ACTIVE_MULTI(tree, node, $event)
        : TREE_ACTIONS.TOGGLE_ACTIVE(tree, node, $event);

      if (node.data.rename_mode) {
        $event.preventDefault();
      }/* else{
        TREE_ACTIONS.TOGGLE_ACTIVE(tree, node, $event);
      } */
    },
    expanderClick: (tree, node, $event) => {
      if (node.data.rename_mode) {
        $event.preventDefault();
      } else {
        //console.log(node);
        TREE_ACTIONS.TOGGLE_EXPANDED(tree, node, $event);
      }
    }
    /* contextMenu: (tree, node, $event) => {
      //$event.preventDefault();
      //alert(`context menu for ${node.data.name}`);
      TREE_ACTIONS.TOGGLE_ACTIVE(tree, node, $event);
    } */
  },
  keys: {
    [KEYS.ENTER]: (tree, node, $event) => alert(`This is ${node.data.name}`)
  }
};


@Component({
  selector: 'app-skos-tree',
  templateUrl: './skos-tree.component.html',
  styleUrls: ['./skos-tree.component.scss']
})
export class SkosTreeComponent implements OnInit, OnDestroy {

  state!: ITreeState;
  @ViewChild('skosTree') skosTree: any;
  @ViewChild(ContextMenuComponent) public skosMenu: ContextMenuComponent;

  selectedNodeId;
  destroy$: Subject<boolean> = new Subject();



  searchIconSpinner = false;
  initialValues
  skosFilterForm = new FormGroup({
    search_text: new FormControl(null),
    search_mode: new FormControl(null)
  })

  counter = 0;
  nodes = [];
  show = false;
  offset: number;
  modalShow: boolean;
  limit: any;

  options: ITreeOptions = {
    getChildren: this.getChildren.bind(this),
    actionMapping,
    allowDrag: (node) => {
      return node.data.conceptSet == undefined;
    },
    allowDrop: (element, { parent, index }) => {
      // return true / false based on element, to.parent, to.index. e.g.
      //console.log(element, parent, index, parent.data.type == 'folder')
      return element.data.conceptSet == undefined;
    },
    getNodeClone: (node) => ({
      ...node.data,
      id: v4(),
      name: `copy of ${node.data.name}`
    })
  };

  constructor(private element: ElementRef,
    private formBuilder: FormBuilder,
    private lexicalService: LexicalEntriesService,
    private conceptService: ConceptService,
    private expander: ExpanderService,
    private toastr: ToastrService,
  ) { }

  ngOnInit(): void {
    
    this.skosFilterForm = this.formBuilder.group({
      search_text: new FormControl(null),
      search_mode: new FormControl('starts')
    })
    this.onChanges();
    this.initialValues = this.skosFilterForm.value
    this.loadTree();
    this.conceptService.deleteSkosReq$.pipe(takeUntil(this.destroy$)).subscribe(
      signal => {

        if (signal != null) {
          this.skosDeleteRequest(signal);
        }

      }
    )
  }


  onChanges() {

    //TODO: filtri
    this.skosFilterForm.valueChanges.pipe(debounceTime(500), takeUntil(this.destroy$)).subscribe(searchParams => {
      console.log(searchParams)
      this.searchFilter(searchParams)
    })
  }

  onEvent = ($event: any) => {
    console.log($event);

    if ($event.eventName == 'activate' &&
      $event.node.data.conceptSet != undefined &&
      this.selectedNodeId != $event.node.data.conceptSet) {

      setTimeout(() => {
        this.selectedNodeId = $event.node.data.conceptSet;
        this.lexicalService.sendToCoreTab($event.node.data);
        this.lexicalService.updateCoreCard({ lastUpdate: $event.node.data['lastUpdate'], creationDate: $event.node.data['creationDate'] })
        if (!this.expander.isEditTabOpen() && !this.expander.isEpigraphyTabOpen()) {
          if (!this.expander.isEditTabExpanded() && !this.expander.isEpigraphyTabExpanded()) {

            this.expander.expandCollapseEdit(true);
            this.expander.openCollapseEdit(true);
          }
        } else if (!this.expander.isEditTabOpen() && this.expander.isEpigraphyTabOpen()) {
          if (!this.expander.isEditTabExpanded() && this.expander.isEpigraphyTabExpanded()) {
            this.expander.expandCollapseEpigraphy(false);
            this.expander.openCollapseEdit(true)
          }
        }
      }, 10);
    } else if ($event.eventName == 'activate' &&
      $event.node.data.lexicalConcept != undefined &&
      this.selectedNodeId != $event.node.data.lexicalConcept) {


      setTimeout(() => {
        this.selectedNodeId = $event.node.data.lexicalConcept;
        this.lexicalService.sendToCoreTab($event.node.data);
        this.lexicalService.updateCoreCard({ lastUpdate: $event.node.data['lastUpdate'], creationDate: $event.node.data['creationDate'] })
        if (!this.expander.isEditTabOpen() && !this.expander.isEpigraphyTabOpen()) {
          if (!this.expander.isEditTabExpanded() && !this.expander.isEpigraphyTabExpanded()) {

            this.expander.expandCollapseEdit(true);
            this.expander.openCollapseEdit(true);
          }
        } else if (!this.expander.isEditTabOpen() && this.expander.isEpigraphyTabOpen()) {
          if (!this.expander.isEditTabExpanded() && this.expander.isEpigraphyTabExpanded()) {
            this.expander.expandCollapseEpigraphy(false);
            this.expander.openCollapseEdit(true)
          }
        }
      }, 10);

    }
  }

  isConceptSet = (item: any): boolean => {
    return item.conceptSet != undefined && item.conceptSet != '';
  }

  isLexicalConcept = (item: any): boolean => {
    return item.lexicalConcept != undefined && item.lexicalConcept != '';
  }

  onMoveNode($event) {
    console.log($event);
    
    if ($event != undefined) {
      //console.log(evt);
      

      let node_source = $event.node.lexicalConcept;
      let node_target = $event.to.parent.lexicalConcept != undefined ? $event.to.parent.lexicalConcept : $event.to.parent.conceptSet;
      /* let parameters = {
        "requestUUID": "string",
        "user-id": 0,
        "element-id": element_id,
        "target-id": target_id
      } */


      /* this.documentService.moveFolder(parameters).subscribe(
        data=>{
          this.toastr.info('Folder '+ evt.node['name'] +' moved', '', {
            timeOut: 5000,
          });
          //console.log(data);
        },error=>{
          console.log(error)
        }
      ) */
    }

  }

  async loadTree() {
    let conceptSets = []
    let rootConceptSets = [];
    let tmp = [];

    try {
      conceptSets = await this.conceptService.getConceptSets().toPromise().then(
        response => response.list
      );

    } catch (error) {
      console.log(error)
    }


    try {
      rootConceptSets = await this.conceptService.getRootLexicalConcepts().toPromise().then(
        response => response.list
      );

    } catch (error) {
      console.log(error)
    }


    if (conceptSets.length > 0) {
      conceptSets.map(
        element => element['hasChildren'] = true
      )
      this.nodes = conceptSets;
    }

    if (rootConceptSets.length > 0 && conceptSets.length == 0) {
      rootConceptSets.map(
        element => {
          element['hasChildren'] = true,
          element['children'] = undefined;
        },
      )

      this.nodes = rootConceptSets;
    }

    

    this.counter = this.nodes.length;
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.complete();
  }

  onScrollDown(treeModel: TreeModel) {


    this.offset += 500;
    this.modalShow = true;

    //@ts-ignore
    $("#lazyLoadingModal").modal("show");
    $('.modal-backdrop').appendTo('.tree-view');
    $('body').removeClass("modal-open")
    $('body').css("padding-right", "");

    let parameters = this.skosFilterForm.value;
    parameters['offset'] = this.offset;
    parameters['limit'] = this.limit;

    /* this.lexicalService.getLexicalEntriesList(parameters).pipe(debounceTime(200), takeUntil(this.destroy$)).subscribe(
      data => {
        //@ts-ignore
        $('#lazyLoadingModal').modal('hide');
        $('.modal-backdrop').remove();
        for (var i = 0; i < data['list'].length; i++) {
          this.nodes.push(data['list'][i]);
        };
        //this.counter = this.nodes.length;
        this.skosTree.treeModel.update();
        this.updateTreeView();
        this.modalShow = false;

        setTimeout(() => {
          //@ts-ignore
          $('#lazyLoadingModal').modal('hide');
          $('.modal-backdrop').remove();
        }, 300);
      },
      error => {

      }
    ) */
  }

  updateTreeView() {


    setTimeout(() => {
      this.counter = this.nodes.length;
      this.skosTree.sizeChanged();

    }, 1000);
  }

  resetFields() {
    this.skosFilterForm.reset(this.initialValues, { emitEvent: false });
    setTimeout(() => {
      this.loadTree();
      this.skosTree.treeModel.update();
      this.updateTreeView();

    }, 500);
  }


  searchFilter(newPar) {

    setTimeout(() => {
      const viewPort_prova = this.element.nativeElement.querySelector('tree-viewport') as HTMLElement;
      viewPort_prova.scrollTop = 0
    }, 300);

    let search_text = newPar.search_text != null ? newPar.search_text : '';
    this.searchIconSpinner = true;
    let parameters = {
      "requestUUID": "string",
      "contains": newPar.search_mode == 'contains' ? true : false,
      "metadata": {},
      "search-text": search_text,
      "start-with": newPar.search_mode == 'start' ? true : false,
      "user-id": 0,
      "exact-date": newPar.date_mode == 'exact' ? true : false,
      "from-date": newPar.date_mode == 'from' ? true : false,
      "util-date": newPar.date_mode == 'until' ? true : false
    };

    console.log(parameters)
    this.searchIconSpinner = false;


  }

  async getChildren(node: any) {
    let newNodes: any;
    if (node.data.conceptSet != undefined || node.data.lexicalConcept != undefined) {

      try {
        let instance = node.data.conceptSet != undefined ? node.data.conceptSet : node.data.lexicalConcept;

        let data = await this.conceptService.getLexicalConcepts(instance).toPromise();
        console.log(data)

        newNodes = data['list'].map((c) => Object.assign({}, c));

        if (Object.keys(newNodes).length > 0) {

          for (const element of newNodes) {

            element['children'] = undefined;
            element['hasChildren'] = true;
            

          }
          return newNodes;
        } else {
          this.toastr.info('No childs for this node', 'Info', { timeOut: 5000 });
          
          return newNodes;
        }

      } catch (error) {
        console.log(error)
        if (error.status != 200) {
          this.toastr.error("Something went wrong, please check the log", "Error", { timeOut: 5000 })
        }
      }



    }

  }

  skosDeleteRequest(signal?) {



    this.skosTree.treeModel.getNodeBy(x => {
      if (signal.conceptSet != undefined && signal.lexicalConcept == undefined) {
        if (x.data.conceptSet === signal.conceptSet) {

          x.parent.data.children.splice(x.parent.data.children.indexOf(x.data), 1);

          this.skosTree.treeModel.update()

          setTimeout(() => {
            this.counter = this.skosTree.treeModel.nodes.length;
          }, 1000);

          return true;
        } else {
          return false;
        }
      } else if (signal.lexicalConcept != undefined) {
        if (x.data.lexicalConcept === signal.lexicalConcept) {

          x.parent.data.children.splice(x.parent.data.children.indexOf(x.data), 1);

          this.skosTree.treeModel.update()
          setTimeout(() => {
            this.counter = this.skosTree.treeModel.nodes.lenght;
          }, 1000);

          return true;
        } else {
          return false;
        }

      } else {
        return false;
      }
    })


  }

  addLexicalConcept(parentNode: any, type : string) {

    if(parentNode){
      let relation = type == 'conceptSet' ? "http://www.w3.org/2004/02/skos/core#inScheme" : "http://www.w3.org/2004/02/skos/core#narrower";
      
      this.conceptService.createNewLexicalConcept().pipe(takeUntil(this.destroy$)).subscribe(
        data => {
          console.log(data);
          if (data != undefined) {
            /* this.toastr.info('New Concept Set added', '', {
              timeOut: 5000,
            }); */
            
            let parameters = {
              relation : relation,
              source : data['defaultLabel'],
              target : parentNode['defaultLabel']
            }

            data['hasChildren'] = true;  
            
            if(type == 'conceptSet'){
              this.conceptService.updateSchemeProperty(parameters).pipe(takeUntil(this.destroy$)).subscribe(
                data=> {
                  console.log(data);
                },error=>{
                  console.log(error);
                  if(error.status == 200){
                    if(parentNode.children == undefined) parentNode.children = [];
                    parentNode.children.push(data);
                    this.toastr.success('Added Lexical Concept', '', {timeOut : 5000});
                    this.skosTree.treeModel.update()
                    this.skosTree.treeModel.getNodeBy(y => {
                      if (y.data.lexicalConcept != undefined) {    
                        if (y.data.lexicalConcept === data.lexicalConcept) {
                          y.setActiveAndVisible();
                          return true;
                        } else {
                          return false;
                        }
                      } else {
                        return false;
                      }
                    })
                    setTimeout(() => {
                      this.counter = this.skosTree.treeModel.nodes.length;
                    }, 1000);
                  }
                }
              );
            }else{
              this.conceptService.updateSemanticRelation(parameters).pipe(takeUntil(this.destroy$)).subscribe(
                data=> {
                  console.log(data);
                },error=>{
                  console.log(error);
                  if(error.status == 200){
                    if(parentNode.children == undefined) parentNode.children = [];
                    parentNode.children.push(data);
                    this.toastr.success('Added Lexical Concept', '', {timeOut : 5000});
                    this.skosTree.treeModel.update()
                    this.skosTree.treeModel.getNodeBy(y => {
                      if (y.data.lexicalConcept != undefined) {    
                        if (y.data.lexicalConcept === data.lexicalConcept) {
                          y.setActiveAndVisible();
                          return true;
                        } else {
                          return false;
                        }
                      } else {
                        return false;
                      }
                    })
                    setTimeout(() => {
                      this.counter = this.skosTree.treeModel.nodes.length;
                    }, 1000);
                  }
                }
              );
            }
            
            

            /* this.nodes.push(data);
            this.updateTreeView();
            this.skosTree.treeModel.update();
            this.skosTree.treeModel.getNodeById(data.id).setActiveAndVisible(); */
          }
  
        }, error => {
          console.log(error)
          this.toastr.error('Error when creating new Concept Set', '', {
            timeOut: 5000,
          });
        }
      )

      /* let parameters = {
        relation : relation,
        source : //nuovo lexical concept,
        target : //conceptSet target
      }
      this.conceptService.updateSchemeProperty() */
    }
    
  }

  addNewConceptSet() {
    this.conceptService.createNewConceptSet().pipe(takeUntil(this.destroy$)).subscribe(
      data => {
        console.log(data);
        if (data != undefined) {
          this.toastr.info('New Concept Set added', '', {
            timeOut: 5000,
          });
          data['hasChildren'] = true;
          this.nodes.push(data);
          this.updateTreeView();
          this.skosTree.treeModel.update();
          this.skosTree.treeModel.getNodeById(data.id).setActiveAndVisible();
        }

      }, error => {
        console.log(error)
        this.toastr.error('Error when creating new Concept Set', '', {
          timeOut: 5000,
        });
      }
    )
  }

}
