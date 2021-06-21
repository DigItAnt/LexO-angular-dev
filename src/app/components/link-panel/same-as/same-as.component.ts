import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { LexicalEntriesService } from 'src/app/services/lexical-entries/lexical-entries.service';
import { DataService, Person } from '../../lexicon-panel/text-detail/edit-detail/core-tab/lexical-entry-core-form/data.service';

@Component({
  selector: 'app-same-as',
  templateUrl: './same-as.component.html',
  styleUrls: ['./same-as.component.scss']
})
export class SameAsComponent implements OnInit {

  @Input() sameAsData: any[] | any;

  private subject: Subject<any> = new Subject();
  subscription: Subscription;
  object: any;
  searchResults: [];
  filterLoading = false;

  sameAsForm = new FormGroup({
    sameAsArray: new FormArray([this.createSameAsEntry()])
  })

  sameAsArray: FormArray;

  constructor(private formBuilder: FormBuilder, private lexicalService : LexicalEntriesService) {
  }

  ngOnInit() {
    this.sameAsForm = this.formBuilder.group({
      sameAsArray: this.formBuilder.array([])
    })

    this.subject.pipe(debounceTime(1000)).subscribe(
      data => {
        this.onSearchFilter(data)
      }
    )
  
    this.triggerTooltip();
  }

  ngOnChanges(changes: SimpleChanges) {
    /* console.log(this.sameAsData); */
    if(changes.sameAsData.currentValue != null){
      this.object = changes.sameAsData.currentValue;
      this.sameAsArray = this.sameAsForm.get('sameAsArray') as FormArray;
      this.sameAsArray.clear();
    }else {
      this.object = null;
    }
  }

  onChangeSameAs(sameAs, index){
    console.log(sameAs.selectedItems)
    if(sameAs.selectedItems.length != 0){
      var selectedValues = sameAs.selectedItems[0].value.lexicalEntry;
      let lexId = this.object.lexicalEntryInstanceName;
    
      let parameters = {
        type : "conceptRef",
        relation : "sameAs",
        value : selectedValues
      }
      console.log(parameters)
      this.lexicalService.updateLinguisticRelation(lexId, parameters).subscribe(
        data=>{
          console.log(data)
        }, error=>{
          console.log(error)
        }
      )
    }
    
    
  }

  deleteData(){
    this.searchResults = [];
  }



  onSearchFilter(data){
    this.filterLoading = true;
    this.searchResults = [];
    if(this.object.lexicalEntryInstanceName != undefined){
      let parameters = {
        text: data,
        searchMode: "startsWith",
        type: "",
        pos: "",
        formType: "entry",
        author: "",
        lang: "",
        status: "",
        offset: 0,
        limit: 500
      }
      console.log(data.length)
      if(data != "" && data.length >= 3){
        this.lexicalService.getLexicalEntriesList(parameters).subscribe(
          data=>{
            console.log(data)
            this.searchResults = data['list']
            this.filterLoading = false;
          },error=>{
            console.log(error)
            this.filterLoading = false;
          }
        )
      }else{
        this.filterLoading = false;
      }
    }else if(this.object.formInstanceName != undefined){
      let lexId = this.object.parentInstanceName;
      let parameters = {
        form: "pesca",
        formType: "lemma",
        lexicalEntry: lexId,
        senseUris: "",
        extendTo: "",
        extensionDegree: 3
      }

      this.lexicalService.getFormList(parameters).subscribe(
        data=>{
          console.log(data)
          this.searchResults = data['list']
          this.filterLoading = false;
        },error=>{
          console.log(error)
          this.filterLoading = false;
        }
      )
    }else{
      this.filterLoading = false;
    }
    console.log(data)
  
  }

  triggerSameAs(evt){
    if(evt.target != undefined){
      this.subject.next(evt.target.value)
    }
    
  }

  triggerTooltip() {
    setTimeout(() => {
      //@ts-ignore
      $('.same-as-tooltip').tooltip({
        trigger: 'hover'
      });
    }, 500);
  }

  createSameAsEntry() {
    return this.formBuilder.group({
      entity: null
    })
  }

  addSameAsEntry() {
    this.sameAsArray = this.sameAsForm.get('sameAsArray') as FormArray;
    this.sameAsArray.push(this.createSameAsEntry());
    this.triggerTooltip();
  }

  removeElement(index) {
    this.sameAsArray = this.sameAsForm.get('sameAsArray') as FormArray;
    this.sameAsArray.removeAt(index);
  }

}
