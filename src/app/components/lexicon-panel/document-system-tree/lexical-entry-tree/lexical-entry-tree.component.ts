import { ApplicationRef, Component, ElementRef, Input, OnInit, Renderer2, ViewChild } from '@angular/core';
import { TreeNode, TreeModel, TREE_ACTIONS, KEYS, IActionMapping, ITreeOptions, ITreeState } from '@circlon/angular-tree-component';
import * as _ from 'underscore';
declare var $: JQueryStatic;

import data from '../../../../../assets/data/lexicalEntries.json';
import async from '../../../../../assets/data/lexicalEntry.json'

import forms from '../../../../../assets/data/mockForms.json';
import senses from '../../../../../assets/data/mockSenses.json';
import frames from '../../../../../assets/data/mockFrames.json';

import status from '../../../../../assets/data/lexicalEntryStatus.json'
import authors from '../../../../../assets/data/authors.json'
import types from '../../../../../assets/data/lexicalEntryTypes.json'
import lang from '../../../../../assets/data/languages.json'
import pos from '../../../../../assets/data/pos.json'


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
        : TREE_ACTIONS.TOGGLE_ACTIVE(tree, node, $event)
    }
  },
  keys: {
    [KEYS.ENTER]: (tree, node, $event) => alert(`This is ${node.data.name}`)
  }
};

@Component({
  selector: 'app-lexical-entry-tree',
  templateUrl: './lexical-entry-tree.component.html',
  styleUrls: ['./lexical-entry-tree.component.scss']
})

export class LexicalEntryTreeComponent implements OnInit {
  state!: ITreeState;
  word = false;
  multiword = false;
  show = false;
  pending = true;
  validated = true;
  searchText = '';
  typeField = 'node.type.includes(\'\')';
  posField = 'node.pos.includes(\'\')';
  start = 0;
  end = 50;
  modalShow = false;
  flagAuthor = false;
  viewPort: any;
  titlePopover = "Search examples"
  popoverWildcards = "<span><b>Multiple character wildcard search:</b></span>&nbsp;<span><i>te*</i></span><br><span><b>Single character wildcard search:</b></span>&nbsp;<span><i>te?t</i></span><br> <b>Fuzzy search:</b></span>&nbsp;<span><i>test~</i></span><br><b>Weighted fuzzy search:</b></span>&nbsp;<span><i>test~0.8</i></span>"
  labelView = true;
  idView = false;

  verified = false;
  
  @Input() triggerShowTree: any;
  @ViewChild('lexicalEntry') lexicalEntryTree: any;
  @ViewChild('pending') pendingCheckbox: any;
  @ViewChild('processing') processingCheckbox: any;
  @ViewChild('ready') readyCheckbox: any;

  nodes = data;
  asyncChildren = async;
  forms = forms;
  senses = senses;
  frames = frames;
  status = status;
  authors = authors;
  types = types;
  languages = lang;
  partOfSpeech = pos;

  options: ITreeOptions = {
    useVirtualScroll: true,
    scrollOnActivate: false,
    nodeHeight: 13,
    actionMapping,
    getChildren: this.getChildren.bind(this)
  };



  constructor(private renderer: Renderer2, private element: ElementRef, appRef: ApplicationRef) { }

  ngOnInit(): void {
    this.viewPort = this.element.nativeElement.querySelector('tree-viewport');
    this.renderer.addClass(this.viewPort, 'search-results');
  }

  ngAfterViewInit(): void { 
    //@ts-ignore
    $('[data-toggle="popover"]').popover({
      html: true,
      title: this.titlePopover,
      content: this.popoverWildcards
    });
  }

  updateTreeView() {

    setTimeout(() => {
      this.lexicalEntryTree.sizeChanged();
      //@ts-ignore
      $('[data-toggle="tooltip"]').tooltip();
    }, 10);
  }

  onEvent = ($event: any) => {
    console.log($event);

    //TRIGGER EVERYTIME A NODE IS EXPANDED
    setTimeout(() => {
      //@ts-ignore
      $('[data-toggle="tooltip"]').tooltip();
    }, 2000);
  };

  onKey = ($event: any) => {
    var that = this;
    setTimeout(function () {
      var results = document.body.querySelectorAll('tree-node-collection > div')[1].children.length;
      if (results == 0) {
        that.show = true;
      } else {
        that.show = false;
      }
    }, 5);
  };

  lexicalFilter(value: string, treeModel: TreeModel, event: any) {

    /* var id = event.currentTarget.id;
    var results = [];
    var children: any[] = [];
    if (event instanceof KeyboardEvent) {
      this.searchText = value;
    } else {
      if (id == 'type' && value != 'Tipo') {
        this.typeField = 'node.type == \'' + value.toLowerCase() + '\'';

      } else if (id == 'type' && value == 'Tipo') {
        this.typeField = 'node.type.includes(\'\')';
      }
      if (id == 'pos' && value != 'Pos') {
        this.posField = 'node.pos == \'' + value.toLowerCase() + '\'';
      } else if (id == 'pos' && value == 'Pos') {
        this.posField = 'node.pos.includes(\'\')';
      }
    }

    if (event.target.localName == 'input') {

      if (id == 'pending') {
        if (this.pendingCheckbox.nativeElement.checked == false) {
          this.pending = false;

        } else {
          this.pending = true;

        }
      }
      if (id == 'ready') {
        if (this.readyCheckbox.nativeElement.checked == false) {
          this.validated = false;

        } else {
          this.validated = true;

        }
      }
    }


    results = _.filter(treeModel.nodes, (node) => {

      if (this.processingCheckbox.nativeElement.checked && (this.readyCheckbox.nativeElement.checked || this.pendingCheckbox.nativeElement.checked)) {

        return node.name.includes(this.searchText)
          && eval(this.typeField)
          && eval(this.posField)
          && (node.pending == this.pending || node.pending == false)
          && (node.validated == this.validated || node.validated == false);
      } else if (this.processingCheckbox.nativeElement.checked && !(this.readyCheckbox.nativeElement.checked && this.pendingCheckbox.nativeElement.checked)) {

        return node.name.includes(this.searchText)
          && eval(this.typeField)
          && eval(this.posField)
          && node.pending == false
          && node.validated == false;
      } else if (!this.processingCheckbox.nativeElement.checked && !(this.readyCheckbox.nativeElement.checked || this.pendingCheckbox.nativeElement.checked)) {

        return node.name.includes(this.searchText)
          && eval(this.typeField)
          && eval(this.posField)
          && node.pending == null
          && node.validated == null;
      }
      else if (!this.processingCheckbox.nativeElement.checked && (this.readyCheckbox.nativeElement.checked && this.pendingCheckbox.nativeElement.checked)) {

        return node.name.includes(this.searchText)
          && eval(this.typeField)
          && eval(this.posField)
          && ((node.pending == true && node.validated == false)
            || (node.pending == false && node.validated == true));
      }
      else {

        return node.name.includes(this.searchText)
          && eval(this.typeField)
          && eval(this.posField)
          && node.pending == this.pending
          && node.validated == this.validated
      }

    });

    _.filter(treeModel.nodes, (node) => {
      if (node["children"] != undefined) {
        children = _.filter(node.children, (child) => {
          return child.name.startsWith(this.searchText)
            && eval(this.typeField)
            && eval(this.posField);
        })
        if (children.length > 0 && this.searchText != '') {
          results.unshift(node);
        }
      }
    });

    console.log(children)

    for (let i = 0; i < treeModel.nodes.length; i++) {
      let nodeTree = treeModel.nodes[i];
      treeModel.setIsHidden({ id: nodeTree.id }, true);
      if (nodeTree["children"] != undefined) {
        for (let j = 0; j < nodeTree.children.length; j++) {
          let childrenNodes = nodeTree.children[j];
          treeModel.setIsHidden({ id: childrenNodes.id }, true);
        }
      }
    }

    if (results.length > 0) {
      for (var i = 0; i < results.length; i++) {
        let nodeResults = results[i];
        for (var j = 0; j < treeModel.nodes.length; j++) {
          let nodeTree = treeModel.nodes[j];
          if (nodeResults.id == nodeTree.id) {
            treeModel.setIsHidden({ id: nodeTree.id }, false);
            if (nodeTree["children"] != undefined) {
              for (var k = 0; k < nodeTree.children.length; k++) {
                let nodeChildren = nodeTree.children[k];
                for (var l = 0; l < children.length; l++) {
                  let nodeResultsChildren = children[l];
                  if (nodeChildren.id == nodeResultsChildren.id) {
                    treeModel.setIsHidden({ id: nodeChildren.id }, false);
                  }
                }
              }
            }
          }
        }
      }
      this.show = false;
    } else {
      for (var i = 0; i < treeModel.nodes.length; i++) {
        let node = treeModel.nodes[i];
        treeModel.setIsHidden({ id: node.id }, true);
        if (node["children"] != undefined) {
          for (var j = 0; j < node.children; j++) {
            let nodeChildren = node.children[j];
            treeModel.setIsHidden({ id: nodeChildren.id }, true);
          }
        }
        this.show = true;
      }
    } */
  }

  onScrollDown(treeModel: TreeModel) {
    console.log('scrolled!!');
    this.start += 50;
    this.end += 50;
    this.modalShow = true;
    //@ts-ignore
    $("#lazyLoadingModal").modal("show");

    //appending modal background inside the blue div
    $('.modal-backdrop').appendTo('.tree-view');

    //remove the padding right and modal-open class from the body tag which bootstrap adds when a modal is shown
    $('body').removeClass("modal-open")
    $('body').css("padding-right", "");



    setTimeout(() => {
      /* if (this.start < this.resultsNumber && this.end < this.resultsNumber) {
        let newData = data.slice(this.start, this.end);
        this.nodes = this.nodes.concat(newData);
      } else if (this.end < this.resultsNumber) {
        let newData = data.slice(this.start, this.resultsNumber);
        this.nodes = this.nodes.concat(newData);
      } */
      this.modalShow = false;
      //@ts-ignore
      $('#lazyLoadingModal').modal('hide');
      $('.modal-backdrop').remove();
    }, 1000)
  }

  getChildren(node: any) {

    //TODO: verificare che tipo di nodo si vuole espandere
    //caso 1: si sta espandendo una lexical entries e si vogliono vedere le 3 sottocartelle Forme, sensi, concetti ecc...
    //caso 2: si vuole espandere una cartella relativa a forme, sensi, concetti bla bla
    let newNodes: any;

    if (node.data.iriURL != undefined) {
      //Qui faccio la chiamata per ottenere i dati sulle sottocartelle form, sens, conc
      newNodes = this.asyncChildren.map((c) => Object.assign({}, c));

    } else if (node.data.label != undefined) {
      if (node.data.label == "Forms") {
        //call forms
        newNodes = this.forms.map((c) => Object.assign({}, c));
        for(var i = 0; i < newNodes.length; i++){
          if(newNodes[i].author == node.parent.data.author){
            newNodes[i]['flagAuthor'] = false
          }else{
            newNodes[i]['flagAuthor'] = true
          }
        }
      } else if (node.data.label == "Senses") {
        //call senses
        newNodes = this.senses.map((c) => Object.assign({}, c));
        for(var i = 0; i < newNodes.length; i++){
          if(newNodes[i].author == node.parent.data.author){
            newNodes[i]['flagAuthor'] = false
          }else{
            newNodes[i]['flagAuthor'] = true
          }
        }
      } else if (node.data.label == "Frames") {
        //call frames
        newNodes = this.frames.map((c) => Object.assign({}, c));
        for(var i = 0; i < newNodes.length; i++){
          if(newNodes[i].author == node.parent.data.author){
            newNodes[i]['flagAuthor'] = false
          }else{
            newNodes[i]['flagAuthor'] = true
          }
        }
      }
    }
    return new Promise((resolve, reject) => {
      setTimeout(() => resolve(newNodes), 1000);
    });
  }

  verifiedSwitch(){
    this.verified = !this.verified;
  }
}