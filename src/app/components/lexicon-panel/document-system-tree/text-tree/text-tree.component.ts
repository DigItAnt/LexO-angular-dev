import { Component, OnInit } from '@angular/core';
import { TreeNode, TreeModel, TREE_ACTIONS, KEYS, IActionMapping, ITreeOptions } from '@circlon/angular-tree-component';
import { DocumentSystemService } from 'src/app/services/document-system/document-system.service';
import { v4 } from 'uuid';


const actionMapping: IActionMapping = {
  mouse: {
    dblClick: (tree, node, $event) => {
      if (node.hasChildren) {
        TREE_ACTIONS.TOGGLE_EXPANDED(tree, node, $event);
      }
    },
    click: (tree, node, $event) => {
      $event.shiftKey
        ? TREE_ACTIONS.TOGGLE_ACTIVE_MULTI(tree, node, $event)
        : TREE_ACTIONS.TOGGLE_ACTIVE(tree, node, $event);
    }
  },
  keys: {
    [KEYS.ENTER]: (tree, node, $event) => alert(`This is ${node.data.name}`)
  }
};


@Component({
  selector: 'app-text-tree',
  templateUrl: './text-tree.component.html',
  styleUrls: ['./text-tree.component.scss']
})

export class TextTreeComponent implements OnInit {

  show = false;

  options: ITreeOptions = {
    actionMapping,
    allowDrag: (node) => node.isLeaf,
    getNodeClone: (node) => ({
      ...node.data,
      id: v4(),
      name: `copy of ${node.data.name}`
    })
  };

  constructor(private documentService: DocumentSystemService) { }

  ngOnInit(): void {

    this.documentService.getDocumentSystem().subscribe(
      data => {
        console.log(data)
        this.nodes = data['documentSystem']
      },
      error => {
        console.log(error)
      }
    )
  }

  nodes = [
    {
      id: 1,
      name: 'root1',
      children: [
        { 
          name: 'child1' 
        },
        { 
          name: 'child2' 
        }
      ]
    },
    {
      name: 'root2',
      id: 2,
      children: [
        { 
          name: 'child2.1', 
          children: [] 
        },
        { 
          name: 'child2.2', children: [
            {
              name: 'grandchild2.2.1'
            }
          ] 
        }
      ]
    },
    { 
      name: 'root3' 
    },
    { 
      name: 'root4', 
      children: [] 
    },
    { 
      name: 'root5', 
      children: null 
    }
  ];

  

  onEvent = ($event: any) => console.log($event);

  onKey = ($event:any) => {
    var that = this;
    setTimeout(function(){ 
      var results = document.body.querySelectorAll('tree-node-collection > div')[0].children.length;
      if(results == 0){
        that.show = true;
      } else {
        that.show = false;
      }
    }, 5);  
  };
}

