import { DatePipe } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, Renderer2, ViewChild } from '@angular/core';
import { FormGroup, FormControl, Validators, FormArray, FormBuilder, ValidatorFn, AbstractControl } from '@angular/forms';
import { TreeNode, TreeModel, TREE_ACTIONS, KEYS, IActionMapping, ITreeOptions } from '@circlon/angular-tree-component';
import { ModalComponent } from 'ng-modal-lib';
import { ContextMenuComponent } from 'ngx-contextmenu';
import { ToastrService } from 'ngx-toastr';
import { debounceTime } from 'rxjs/operators';
import { AnnotatorService } from 'src/app/services/annotator/annotator.service';
import { DocumentSystemService } from 'src/app/services/document-system/document-system.service';
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
      /* $event.shiftKey
        ? TREE_ACTIONS.TOGGLE_ACTIVE_MULTI(tree, node, $event)
        : TREE_ACTIONS.TOGGLE_ACTIVE(tree, node, $event); */
      
      if(node.data.rename_mode){
        $event.preventDefault();
      }else{
        TREE_ACTIONS.TOGGLE_ACTIVE(tree, node, $event);
      }
    },
    expanderClick: (tree, node, $event) => {
      if(node.data.rename_mode){
        $event.preventDefault();
      }else{
        console.log(node);
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
  selector: 'app-text-tree',
  templateUrl: './text-tree.component.html',
  styleUrls: ['./text-tree.component.scss'],
  providers: [DatePipe]
})

export class TextTreeComponent implements OnInit {
  @ViewChild('metadata_tags') metadata_tags_element: any;
  @ViewChild('treeText') treeText: any;
  @ViewChild(ContextMenuComponent) public basicMenu: ContextMenuComponent;
  
  @HostListener('document:click', ['$event'])
  clickout(event : MouseEvent) {
    if(this.renameNode_input != undefined){
      if(this.renameNode_input.nativeElement.contains(event.target)) {
        console.log("clicked inside");
        event.stopPropagation();
      } else {
        console.log("clicked outside");
        
        var that = this;

        setTimeout(() => {
          //@ts-ignore
          $('.input-tooltip').tooltip('hide');
          setTimeout(() => {
            that.treeText.treeModel.getNodeBy(
              item => {
                item.data.rename_mode = false;
              }
            )
          }, 100);
        }, 300);
      }
    }
  }
  
  show = false;
  nodes : any;

  renameNodeSelected : any;
  validName = null;
  searchIconSpinner = false;
  searchIconSpinner_input = false;
  selectedFileToCopy : any;
  selectedNodeId;

  memoryMetadata = [];
  metadataForm = new FormGroup({
    element_id : new FormControl(null),
    metadata_array: new FormArray([], [Validators.required]),
  })
  
  
  metadata_array: FormArray;
  metadata_search : FormArray;
  
  options: ITreeOptions = {
    actionMapping,
    allowDrag: (node) => node.isLeaf,
    getNodeClone: (node) => ({
      ...node.data,
      id: v4(),
      name: `copy of ${node.data.name}`
    })
  };

  
/*   @ViewChild('renameFolderInput') renameFolder_input:ElementRef; 
  @ViewChild('renameFileInput') renameFile_input:ElementRef;  */
  @ViewChild('uploadFile') uploadFile_input:ElementRef; 
  @ViewChild('renameNodeInput') renameNode_input:ElementRef; 
  /* @ViewChild('renameFolderModel', {static: false}) renameFolderModal: ModalComponent; */
  @ViewChild('editMetadata', {static: false}) editMetadataModal: ModalComponent;
  
  date = this.datePipe.transform(new Date(), 'yyyy-MM-ddThh:mm');
  counter = 0;

  textFilterForm = new FormGroup({
    search_text : new FormControl(null),
    search_mode : new FormControl(null),
    import_date : new FormControl(this.date),
    date_mode : new FormControl(''),
    /* metadata_array : new FormArray([this.createMetadataItemSearch()]) */
  })

  initialValues;

  
  
  constructor(private lexicalService: LexicalEntriesService, private annotatorService : AnnotatorService, private expander : ExpanderService, private element: ElementRef, private documentService: DocumentSystemService, private renderer: Renderer2, private formBuilder: FormBuilder, private datePipe:DatePipe, private toastr: ToastrService) { }

  ngOnInit(): void {
    this.loadTree();
    
    this.textFilterForm = this.formBuilder.group({
      search_text : new FormControl(null),
      search_mode : new FormControl('start'),
      import_date : new FormControl(this.date),
      date_mode : new FormControl('until'),
      metadata_array : new FormArray([])
    })

    this.onChanges();
    
    this.metadataForm = this.formBuilder.group({
      element_id : new FormControl(null),
      name : new FormControl(null),
      metadata_array: new FormArray([], [Validators.required]),
    });

    this.initialValues = this.textFilterForm.value
  }

  onChanges() {
    this.textFilterForm.valueChanges.pipe(debounceTime(500)).subscribe(searchParams => {
      console.log(searchParams)
      this.searchFilter(searchParams)
    })
  }
  
  onEvent = ($event: any) => {
    console.log($event);

    if ($event.eventName == 'activate' && $event.node.data.type != 'directory' && this.selectedNodeId != $event.node.data['element-id']) {
      this.selectedNodeId = $event.node.data['element-id'];
      //@ts-ignore
      $("#epigraphyTabModal").modal("show");
      $('.modal-backdrop').appendTo('.epigraphy-tab-body');
      //@ts-ignore
      $('#epigraphyTabModal').modal({backdrop: 'static', keyboard: false})  
      $('body').removeClass("modal-open")
      $('body').css("padding-right", "");

      this.annotatorService.getTokens(this.selectedNodeId).subscribe(
        data => {

          let element_id = this.selectedNodeId;
          let tokens = data;
          this.documentService.sendToEpigraphyTab({
            tokens : tokens,
            element_id : element_id
          })

          if(!this.expander.isEditTabOpen() && !this.expander.isEpigraphyTabOpen()){
            if(!this.expander.isEditTabExpanded() && !this.expander.isEpigraphyTabExpanded()){
              
              this.expander.expandCollapseEpigraphy(true);
              this.expander.openCollapseEpigraphy(true);
            }
          }else if(this.expander.isEditTabOpen() && !this.expander.isEpigraphyTabOpen()){
            if(this.expander.isEditTabExpanded() && !this.expander.isEpigraphyTabExpanded()){
              this.expander.openCollapseEpigraphy(true);
              this.expander.expandCollapseEdit(false);
            }
          }
        },
        error => {
          console.log(error)
        }
      );
      
      
      
      /* this.lexicalService.getLexEntryData(idLexicalEntry).subscribe(
        data => {
          
          console.log(data);
          this.selectedNodeId = $event.node.data.lexicalEntryInstanceName;
          this.lexicalService.sendToCoreTab(data);
          this.lexicalService.sendToRightTab(data);
          this.lexicalService.sendToEtymologyTab(null);
          //this.lexicalService.updateLexCard({lastUpdate : data['lastUpdate'], creationDate : data['creationDate']});

          
        },
        error => {

        }
      ) */
    }
  }

  

  onMoveNode($event) {
    console.log($event);
    let node_type = $event.node.type;
    let target_type = $event.to.parent.type;
    if(node_type === 'directory' && target_type === 'directory'){
      this.moveFolder($event)
    }else if(node_type === 'file' && target_type === 'directory'){
      this.moveFile($event)
    }
    
  }

  loadTree(){
    this.documentService.getDocumentSystem().subscribe(
      data => {
        console.log(data)
        if(data['documentSystem'].length != 0){
          this.nodes = data['documentSystem'];
          setTimeout(() => {
            this.treeText.treeModel.getNodeBy(
              item => {
                item.data.rename_mode = false;
              }
            )
          }, 100);
        }
        
        
        this.counter = data['results'];
      },
      error => {
        console.log(error)
      }
    )
  }

  isFolder(item : any){
    if(item.type != undefined){
      return item.type == 'directory';
    }else{
      return false
    }
  }

  isFile(item : any){
    if(item.type != undefined){
      return item.type == 'file';
    }else{
      return false
    }
  }

  noRoot(item : any){
    return item.name != 'root';
  }
  

  addFolder(evt){
    if(evt != undefined){
      let element_id = evt['element-id'];
      let parameters = {
        "requestUUID" : "string",
        "user-id" : 0,
        "element-id" : element_id
      }
      
      const expandedNodes = this.treeText.treeModel.expandedNodes;
      
      this.documentService.addFolder(parameters).subscribe(
        data=>{
          this.toastr.info('New folder added', '', {
            timeOut: 5000,
          });
          this.treeText.treeModel.getNodeBy(x => {
            if(x.data['element-id'] === element_id){
              x.expand()
              let element_id_new_node = Math.floor(Math.random() * (9728157429307 - 1728157429307) + 1728157429307);
              let id_new_node = Math.floor(Math.random() * (9728157429307 - 1728157429307) + 1728157429307);
              let new_node = {
                "children" : [],
                "element-id" : element_id_new_node,
                "id" : id_new_node,
                "metadata" : {},
                "path" : "",
                "name" : "new-folder_"+ Math.floor(Math.random() * (99999 - 10) + 10),
                "type" : "directory",
                "rename_mode" : false
              }
              console.log(x)
              x.data.children.push(new_node);
              
              setTimeout(() => {
                this.updateTreeView();
                this.treeText.treeModel.update();
                this.treeText.treeModel.getNodeById(id_new_node).setActiveAndVisible();
              }, 100);
              
            }
          }) 
          
        },error=>{
          console.log(error)
        }
      )
    }
  }

  addFile(evt){
    console.log(evt)
    let element_id = this.uploadFile_input.nativeElement['element-id'];
    let file_name = evt.target.files[0].name;
    this.renderer.removeAttribute(this.uploadFile_input.nativeElement, 'element-id');

    let parameters = {
      "requestUUID" : "string",
      "user-id" : 0,
      "element-id" : element_id,
      "file-name" : file_name
    }
    
    console.log(parameters)
    const expandedNodes = this.treeText.treeModel.expandedNodes;

    const formData = new FormData();
    formData.append('file', evt.target.files[0])
    
    this.documentService.uploadFile(formData, element_id, 11).subscribe(
      data=>{
        console.log(data)
       
        this.treeText.treeModel.getNodeBy(x => {
          if(x.data['element-id'] === element_id){
            x.expand()
            /* let element_id_new_node = Math.floor(Math.random() * (9728157429307 - 1728157429307) + 1728157429307);
            let id_new_node = Math.floor(Math.random() * (9728157429307 - 1728157429307) + 1728157429307);
            let new_node = {
              "children" : [],
              "element-id" : element_id_new_node,
              "id" : id_new_node,
              "metadata" : {},
              "path" : "",
              "name" : "new-file_"+ Math.floor(Math.random() * (99999 - 10) + 10),
              "type" : "file",
              "rename_mode" : false
            } */
            this.toastr.info('New file added', '', {
              timeOut: 5000,
            });
            console.log(x)
            x.data.children.push(data.node)
            setTimeout(() => {
              this.updateTreeView();
              this.treeText.treeModel.update();
              this.treeText.treeModel.getNodeById(data.node.id).setActiveAndVisible();
            }, 100);
            
          }
        })    
        
        
        
      },error=>{
        console.log(error)
      }
    )
    
  }

  triggerUploader(evt){
    let element_id = evt['element-id']
    this.renderer.setProperty(this.uploadFile_input.nativeElement, 'element-id', element_id)
    this.uploadFile_input.nativeElement.click();
    
  }

  copyFile(evt){
    console.log(evt);
    this.selectedFileToCopy = evt
  }

  pasteFile(evt){
    console.log(evt)
    let element_id_target = evt['element-id'];
    let element_id_source = this.selectedFileToCopy['element-id'];
    let parameters = {
      "requestUUID": "string",
      "user-id": 0,
      "element-id": element_id_source,
      "target-id": element_id_target
    }
            
    this.documentService.copyFileTo(parameters).subscribe(
      data=>{
        console.log(data);
        this.nodes = data['documentSystem'];
        this.toastr.info('File '+ evt['name'] +' copied', '', {
          timeOut: 5000,
        });
        setTimeout(() => {
          
          this.treeText.treeModel.getNodeBy(x => {
            if(x.data['element-id'] === element_id_target){
              x.expand();
            }
          })              
        }, 300);
        this.selectedFileToCopy = null;
      },error=>{
        //console.log(error)
        this.selectedFileToCopy = null;
      }
    )
    

  }

  downloadFile(evt){
    console.log(evt)
    let element_id = evt['element-id'];
    let parameters = {
      "requestUUID": "string",
      "user-id": 0,
      "element-id": element_id,
    }
            
    this.documentService.downloadFile(parameters).subscribe(
      data=>{
        console.log(data);
        this.toastr.info('File '+ evt['name'] +' downloaded', '', {
          timeOut: 5000,
        });
        
      },error=>{
        //console.log(error)
      }
    )
  }
  
  removeFile(evt){
    if(evt != undefined){
      let element_id = evt['element-id'];
      let parameters = {
        "requestUUID" : "string",
        "user-id" : 0,
        "element-id" : element_id,
      }


      const expandedNodes = this.treeText.treeModel.expandedNodes;

      this.documentService.removeFile(parameters).subscribe(
        data=>{
          //console.log(data);
          this.toastr.info('File '+ evt['name'] +' deleted', '', {
            timeOut: 5000,
          });
          this.nodes = data['documentSystem'];
          this.lexicalService.sendToAttestationPanel(null);
          this.documentService.sendToEpigraphyTab(null)
          this.expander.expandCollapseEpigraphy(false);
          this.expander.openCollapseEpigraphy(false)
          /* expandedNodes.forEach( (node: TreeNode) => {
          
            setTimeout(() => {
              this.treeText.treeModel.getNodeBy(x => {
                if(x.data['element-id'] === node.data['element-id']){
                  x.expand()
                }
              })              
            }, 300);
          }) */

          this.treeText.treeModel.getNodeBy(x => {
            if(x.data['element-id'] === element_id){
              x.parent.data.children.splice(x.parent.data.children.indexOf(x.data), 1)
            }
          })

          this.treeText.treeModel.update()
          
          
        },error=>{
          console.log(error)
          if(typeof(error.error) == 'string'){
            this.toastr.info(error.error, '', {
              timeOut: 5000,
            });
          }
          
        }
      )
    }
  }
  


  removeFolder(evt){
    if(evt != undefined){
      let element_id = evt['element-id'];
      let parameters = {
        "requestUUID" : "string",
        "user-id" : 0,
        "element-id" : element_id
      }
      this.toastr.info('Folder '+ evt['name'] +' deleted', '', {
        timeOut: 5000,
      });
      const expandedNodes = this.treeText.treeModel.expandedNodes;

      this.documentService.removeFolder(parameters).subscribe(
        data=>{
          console.log(data);
          
          //this.nodes = data['documentSystem'];
          /* expandedNodes.forEach( (node: TreeNode) => {
          
            setTimeout(() => {
              this.treeText.treeModel.getNodeBy(x => {
                if(x.data['element-id'] === node.data['element-id']){
                  x.expand()
                }
              })              
            }, 300);
          }) */

          this.treeText.treeModel.getNodeBy(x => {
            if(x.data['element-id'] === element_id){
              x.parent.data.children.splice(x.parent.data.children.indexOf(x.data), 1)
            }
          })

          this.treeText.treeModel.update()
          
          
        },error=>{
          console.log(error)
          if(typeof(error.error) == 'string'){
            this.toastr.info(error.error, '', {
              timeOut: 5000,
            });
          }
        }
      )
    }
  }

  moveFolder(evt){
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
            
      
      this.documentService.moveFolder(parameters).subscribe(
        data=>{
          this.toastr.info('Folder '+ evt.node['name'] +' moved', '', {
            timeOut: 5000,
          });
          /* //console.log(data); */
        },error=>{
          console.log(error)
        }
      )
    }
  }

  moveFile(evt){
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
            
      
      this.documentService.moveFileTo(parameters).subscribe(
        data=>{
          console.log(data);
          this.toastr.info('File '+ evt['name'] +' moved', '', {
            timeOut: 5000,
          });
          
        },error=>{
          //console.log(error)
        }
      )
    }
  }

  renameNode(evt){
    setTimeout(() => {
      this.renameNode_input.nativeElement.focus();
      //@ts-ignore
      $('.input-tooltip').tooltip({
          trigger: 'hover'
      });
    }, 300);
    console.log(evt)
    
    this.treeText.treeModel.getNodeBy(
      node => {
        if(node.data['element-id'] == evt['element-id']){
          node.data.rename_mode = true;
          
        }else{
          node.data.rename_mode = false;
        }
      }
    )
  }

  onRenamingNode(evt, node, new_value){
    console.log(evt, node);
    setTimeout(() => {
      //@ts-ignore
      $('.input-tooltip').tooltip({
          trigger: 'hover'
      });
    }, 300);
    switch(evt.key){
      case 'Enter' : this.updateNodeName(node, new_value); break;
      case 'Escape': this.exitRenamingMode(); break;
      default: console.log(evt)
    }
    
  }

  updateNodeName(node, new_value){
    this.searchIconSpinner_input = true;
    let node_type = node.data.type;

    if(new_value.match(/^[A-Za-z-_0-9. ]{3,}$/)){
      let element_id = node.data['element-id'];
      let parameters = {
        "requestUUID": "string",
        "user-id": 0,
        "element-id": element_id,
        "rename-string": new_value
      }

      if(node_type == 'directory'){
        
        this.documentService.renameFolder(parameters).subscribe(
          data=> {
            //console.log(data);
            this.toastr.info('Folder '+ node.data.name +' name updated', '', {
              timeOut: 5000,
            });
            setTimeout(() => {
              this.treeText.treeModel.getNodeBy(x => {
                if(x.data['element-id'] === element_id){
                  x.data.name = new_value;
                }
              })              
            }, 300);
            this.searchIconSpinner_input = false;
            this.renameNode_input.nativeElement.value = '';
            var that = this;

            setTimeout(() => {
              //@ts-ignore
              $('.input-tooltip').tooltip('hide');
              setTimeout(() => {
                that.treeText.treeModel.getNodeBy(
                  item => {
                    item.data.rename_mode = false;
                  }
                )
              }, 100);
            }, 100);
          },error=>{
            console.log(error)
            var that = this;

            setTimeout(() => {
              //@ts-ignore
              $('.input-tooltip').tooltip('hide');
              setTimeout(() => {
                that.treeText.treeModel.getNodeBy(
                  item => {
                    item.data.rename_mode = false;
                  }
                )
              }, 100);
            }, 100);
          }
        )

      }else if(node_type == 'file'){
        this.documentService.renameFile(parameters).subscribe(
          data=> {
            this.toastr.info('Folder name updated', '', {
              timeOut: 5000,
            });
            //console.log(data);
            setTimeout(() => {
              this.treeText.treeModel.getNodeBy(x => {
                if(x.data['element-id'] === element_id){
                  x.data.name = new_value;
                }
              })              
            }, 300);
            this.searchIconSpinner_input = false;
            this.renameNode_input.nativeElement.value = '';
            var that = this;

            setTimeout(() => {
              //@ts-ignore
              $('.input-tooltip').tooltip('hide');
              setTimeout(() => {
                that.treeText.treeModel.getNodeBy(
                  item => {
                    item.data.rename_mode = false;
                  }
                )
              }, 100);
            }, 100);
          },error=>{
            console.log(error)
            var that = this;

            setTimeout(() => {
              //@ts-ignore
              $('.input-tooltip').tooltip('hide');
              setTimeout(() => {
                that.treeText.treeModel.getNodeBy(
                  item => {
                    item.data.rename_mode = false;
                  }
                )
              }, 100);
            }, 100);
          }
        )
      }
    }
    
  }

  exitRenamingMode(){
    var that = this;

    setTimeout(() => {
      //@ts-ignore
      $('.input-tooltip').tooltip('hide');
      setTimeout(() => {
        
        that.searchIconSpinner_input = false;
        that.treeText.treeModel.getNodeBy(
          item => {
            item.data.rename_mode = false;
          }
        )
      }, 100);
    }, 300);
  }

  saveMetadata(){
    console.log(this.metadata_array.value)
    let element_id = this.metadataForm.get('element_id').value;
    let name = this.metadataForm.get('name').value;
    let parameters = {
      "requestUUID": "string",
      "metadata": {},
      "user-id": 0,
      "element-id": element_id
    };
    
    this.metadata_array.value.forEach(element => {
      parameters.metadata[element.key] = element.value
    });

    const expandedNodes = this.treeText.treeModel.expandedNodes;

    this.documentService.updateMetadata(parameters).subscribe(
      data=> {
        this.toastr.info('Metadata updated for ' + name + ' node' , '', {
          timeOut: 5000,
        });
        //console.log(data);
        this.nodes = data['documentSystem'];
        expandedNodes.forEach( (node: TreeNode) => {
          
          setTimeout(() => {
            this.treeText.treeModel.getNodeBy(x => {
              if(x.data['element-id'] === node.data['element-id']){
                x.setActiveAndVisible()
              }
            })              
          }, 300);
        })
      },error =>{
        console.log(error)
      }
    )
  }

  removeMetadataItem(index){
    this.metadata_array = this.metadataForm.get('metadata_array') as FormArray;
    let name = this.metadata_array.at(index).get('name').value;
    this.toastr.info('Metadata deleted for ' + name + ' node' , '', {
      timeOut: 5000,
    });
    this.memoryMetadata.splice(index, 1)
    this.metadata_array.removeAt(index);
    this.metadataForm.markAsTouched();
    
  }

  addMetadata(k?, v?){
    this.metadata_array = this.metadataForm.get('metadata_array') as FormArray;

    if (k == undefined) {
      this.metadata_array.push(this.createMetadataItem());
    } else {
      this.metadata_array.push(this.createMetadataItem(k, v));
    }
  }

  onCloseRemoveMetadata(){
    this.selectedFileToCopy = null;
  }

  deleteMetadata(){
    let element_id = this.selectedFileToCopy['element-id'];
    let name = this.selectedFileToCopy['name'];
    let parameters = {
      "requestUUID": "string",
      "user-id": 0,
      "element-id": element_id
    }
    
    const expandedNodes = this.treeText.treeModel.expandedNodes;

    this.documentService.deleteMetadata(parameters).subscribe(
      data=> {
        //console.log(data);
        this.toastr.info('Metadata deleted for ' + name + ' node' , '', {
          timeOut: 5000,
        });
        this.nodes = data['documentSystem'];
        expandedNodes.forEach( (node: TreeNode) => {
          
          setTimeout(() => {
            this.treeText.treeModel.getNodeBy(x => {
              if(x.data['element-id'] === node.data['element-id']){
                x.setActiveAndVisible()
              }
            })              
          }, 300);
        })
      },error =>{
        console.log(error)
      }
    )
  }

  onCloseModal(){
    this.metadataForm.markAsUntouched();
    this.metadata_array.clear();
    this.memoryMetadata = [];
  }

  populateMetadata(item : any){
    let element_id = item['element-id'];
    let name = item['name'];
    this.metadataForm.get('name').setValue(name, {emitEvent : false})
    this.metadataForm.get('element_id').setValue(element_id, {emitEvent : false});
    this.editMetadataModal.show();

    this.metadata_array = this.metadataForm.get('metadata_array') as FormArray;
    this.metadata_array.clear();
    this.memoryMetadata = [];

    if(Object.keys(item.metadata).length != 0){
      for (const [key, value] of Object.entries(item.metadata)) {
        console.log(`${key}: ${value}`);
        this.addMetadata(key, value)
      }
    }else{
      null;
    }
    
  }

  createMetadataItem(k?, v?){
    if(k != undefined){
      return this.formBuilder.group({
        key: new FormControl(k, [Validators.required, Validators.minLength(0)]),
        value: new FormControl(v, [Validators.required, Validators.minLength(0)])
      })
    }else{
      return this.formBuilder.group({
        key: new FormControl('', [Validators.required, Validators.minLength(0), this.uniqueIdValidator.bind(this)]),
        value: new FormControl('', [Validators.required, Validators.minLength(0)])
      })
    }
  }

  uniqueIdValidator(control: FormControl) {
    /* console.log(control)
    console.log(this.metadata_array) */
    if(control.value != ''){
      if (this.metadata_array.value.find(item => item.key === control.value)) {
        return { duplicate: true };
      } else {
        return null;
      }
    }else{
      return null
    }
    
  }

  updateTreeView() {
    setTimeout(() => {
      //@ts-ignore
      $('.input-tooltip').tooltip({
          trigger: 'hover'
      });
    }, 300);
    
    setTimeout(() => {
      this.treeText.sizeChanged();
      //@ts-ignore
      $('.lexical-tooltip').tooltip();
    }, 1000);
  }

  resetFields(){
    
    this.textFilterForm.reset(this.initialValues, {emitEvent : false});
    setTimeout(() => {
      this.loadTree();
      this.treeText.treeModel.update();
      this.updateTreeView();
      
    }, 500);  
    
  }

  searchFilter(newPar) {
    
    setTimeout(() => {
      const viewPort_prova = this.element.nativeElement.querySelector('tree-viewport') as HTMLElement;
      viewPort_prova.scrollTop = 0
    }, 300);

    let search_text = newPar.search_text != null ? newPar.search_text : '';
    let date_pipe = this.datePipe.transform(newPar.import_date, 'yyyy-MM-ddThh:mm:ss.zzzZ')
    this.searchIconSpinner = true;
    let parameters = {
      "requestUUID" : "string",
      "contains" : newPar.search_mode == 'contains' ? true : false,
      "metadata" : {},
      "search-text": search_text,
      "start-with" : newPar.search_mode == 'start' ? true : false,
      "user-id": 0,
      "import-date": date_pipe,
      "exact-date": newPar.date_mode == 'exact' ? true : false,
      "from-date":  newPar.date_mode == 'from' ? true : false,
      "util-date":  newPar.date_mode == 'until' ? true : false
    };
    
    console.log(parameters)
    
    this.documentService.searchFiles(newPar).subscribe(
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
      }
    )
  }

  addTagFn(name) {
    return { name: name, tag: true };
  }

  triggerMetadata(){
    console.log(this.metadata_tags_element.selectedItems)
  }

}

