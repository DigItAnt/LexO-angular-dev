import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormControl, FormBuilder } from '@angular/forms';
import { IActionMapping, TREE_ACTIONS, KEYS, ITreeState, ITreeOptions, TreeModel } from '@circlon/angular-tree-component';
import { debounceTime } from 'rxjs/operators';
import { ConceptService } from 'src/app/services/concept/concept.service';
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
export class SkosTreeComponent implements OnInit {

  state!: ITreeState;
  @ViewChild('skosConcept') skosConcept: any;
  selectedNodeId;

  options: ITreeOptions = {
    actionMapping,
    allowDrag: (node) => node.isLeaf,
    allowDrop: (element, { parent, index }) => {
      // return true / false based on element, to.parent, to.index. e.g.
      //console.log(element, parent, index, parent.data.type == 'folder')
      return parent.data.type == 'directory';
    },
    getNodeClone: (node) => ({
      ...node.data,
      id: v4(),
      name: `copy of ${node.data.name}`
    })
  };


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

  constructor(private element: ElementRef,
    private formBuilder: FormBuilder,
    private lexicalService: LexicalEntriesService,
    private conceptService: ConceptService
  ) { }

  ngOnInit(): void {
    this.loadTree();
    this.skosFilterForm = this.formBuilder.group({
      search_text : new FormControl(null),
      search_mode : new FormControl('starts')
    })
    this.onChanges();
    this.initialValues = this.skosFilterForm.value
  }


  onChanges() {
    this.skosFilterForm.valueChanges.pipe(debounceTime(500)).subscribe(searchParams => {
      console.log(searchParams)
      this.searchFilter(searchParams)
    })
  }

  onEvent = ($event: any) => {
    console.log($event);

    if ($event.eventName == 'activate' && $event.node.data.type != 'directory' && this.selectedNodeId != $event.node.data['element-id']) {
      this.selectedNodeId = $event.node.data['element-id'];
      /* //@ts-ignore
      $("#epigraphyTabModal").modal("show");
      $('.modal-backdrop').appendTo('.epigraphy-tab-body');
      //@ts-ignore
      $('#epigraphyTabModal').modal({backdrop: 'static', keyboard: false})  
      $('body').removeClass("modal-open")
      $('body').css("padding-right", ""); */

    }
  }

  

  onMoveNode($event) {
    console.log($event);
    let node_type = $event.node.type;
    let target_type = $event.to.parent.type;
    this.moveNode($event);
    
  }

  moveNode(evt){
    if(evt != undefined){
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

  loadTree(){
    

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

    this.lexicalService.getLexicalEntriesList(parameters).pipe(debounceTime(200)).subscribe(
      data => {
        //@ts-ignore
        $('#lazyLoadingModal').modal('hide');
        $('.modal-backdrop').remove();
        for (var i = 0; i < data['list'].length; i++) {
          this.nodes.push(data['list'][i]);
        };
        //this.counter = this.nodes.length;
        this.skosConcept.treeModel.update();
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
      //@ts-ignore
      $('.input-tooltip').tooltip({
          trigger: 'hover'
      });
    }, 300);
    
    setTimeout(() => {
      this.skosConcept.sizeChanged();
      //@ts-ignore
      $('.lexical-tooltip').tooltip();
    }, 1000);
  }

  resetFields(){
    this.skosFilterForm.reset(this.initialValues, {emitEvent : false});
    setTimeout(() => {
      this.loadTree();
      this.skosConcept.treeModel.update();
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
      "requestUUID" : "string",
      "contains" : newPar.search_mode == 'contains' ? true : false,
      "metadata" : {},
      "search-text": search_text,
      "start-with" : newPar.search_mode == 'start' ? true : false,
      "user-id": 0,
      "exact-date": newPar.date_mode == 'exact' ? true : false,
      "from-date":  newPar.date_mode == 'from' ? true : false,
      "util-date":  newPar.date_mode == 'until' ? true : false
    };
    
    console.log(parameters)
    this.searchIconSpinner = false;
    
    /* this.documentService.searchFiles(newPar).subscribe(
      data => {
        if(data['files'].length > 0){
          this.show = false;
        }else {
          this.show = true;
        }
        this.nodes = data['files'];
        this.counter = data['results'];
        this.treeText.treeModel.update();
        this.updateTreeView();
        this.searchIconSpinner = false;
        
      },
      error => {
        console.log(error)
        this.searchIconSpinner = false;

        this.toastr.error('Error on search text', 'Error', {
          timeOut : 5000
        })
      }
    ) */
  }

}