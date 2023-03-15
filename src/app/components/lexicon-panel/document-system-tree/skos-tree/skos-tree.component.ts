import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormControl, FormBuilder } from '@angular/forms';
import { IActionMapping, TREE_ACTIONS, KEYS, ITreeState, ITreeOptions, TreeModel } from '@circlon/angular-tree-component';
import { ContextMenuComponent } from 'ngx-contextmenu';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil, tap } from 'rxjs/operators';
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
    this.loadTree();
    this.skosFilterForm = this.formBuilder.group({
      search_text: new FormControl(null),
      search_mode: new FormControl('starts')
    })
    this.onChanges();
    this.initialValues = this.skosFilterForm.value

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

    //TODO: inserire logica quando clicco su un nodo
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
    let node_type = $event.node.type;
    let target_type = $event.to.parent.type;
    this.moveNode($event);

  }

  moveNode(evt) {

    //TODO: ridefinire drag and drop
    if (evt != undefined) {
      //console.log(evt);
      let element_id = evt.node['element-id'];
      let target_id = evt.to.parent['element-id'];
      let parameters = {
        "requestUUID": "string",
        "user-id": 0,
        "element-id": element_id,
        "target-id": target_id
      }


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
    let conceptSets, rootConceptSets;

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

    if (rootConceptSets.length > 0) {
      rootConceptSets.map(
        element => element['hasChildren'] = true
      )
      rootConceptSets.forEach(
        element => { this.nodes.push(element) }
      );
    }

    this.counter = this.nodes.length;
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.complete();
  }

  onScrollDown(treeModel: TreeModel) {


    //TODO: check lazy loading questo componente, non vorrei ci siano informazioni su altri componenti
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

    this.lexicalService.getLexicalEntriesList(parameters).pipe(debounceTime(200), takeUntil(this.destroy$)).subscribe(
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
    )
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

        let data = await this.conceptService.getLexicalConcepts(instance).toPromise().then(
          response => response.list
        );
        console.log(data)

        newNodes = data.map((c) => Object.assign({}, c));

        if (Object.keys(newNodes).length > 0) {

          for (const element of newNodes) {

            /* if (element.label == 'form') {
              let form_data = await this.lexicalService.getLexEntryForms(instance).toPromise();
              element.isExpanded = true;
              element.children = [];

              form_data.forEach(form => {
                element.children.push(form);
              });
            } else if (element.label == 'sense') {
              let sense_data = await this.lexicalService.getSensesList(instance).toPromise();
              element.isExpanded = true;
              element.children = [];
              sense_data.forEach(sense => {
                element.children.push(sense);
              });
            } else if (element.label == 'etymology') {
              let etymology_data = await this.lexicalService.getEtymologies(instance).toPromise();
              element.isExpanded = true;
              element.children = [];
              etymology_data.forEach(etym => {
                element.children.push(etym);
              });
            } else if (element.label == 'subterm') {
              let subterm_data = await this.lexicalService.getSubTerms(instance).toPromise();
              element.isExpanded = true;
              element.children = [];
              subterm_data.forEach(subterm => {
                subterm.hasChildren = false;
                element.children.push(subterm);
              });
            } */

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

          return true;
        } else {
          return false;
        }
      } else if (signal.lexicalConcept != undefined) {
        if (x.data.lexicalConcept === signal.lexicalConcept) {

          x.parent.data.children.splice(x.parent.data.children.indexOf(x.data), 1);

          this.skosTree.treeModel.update()

          return true;
        } else {
          return false;
        }

      } else {
        return false;
      }
    })


  }

  addLexicalConcept(parentNode: any) {
    console.log(parentNode)
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
