/*
  © Copyright 2021-2022  Istituto di Linguistica Computazionale "A. Zampolli", Consiglio Nazionale delle Ricerche, Pisa, Italy.
 
This file is part of EpiLexo.

EpiLexo is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

EpiLexo is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with EpiLexo. If not, see <https://www.gnu.org/licenses/>.
*/

import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { NgSelectComponent } from '@ng-select/ng-select';
import { ToastrService } from 'ngx-toastr';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { LexicalEntriesService } from 'src/app/services/lexical-entries/lexical-entries.service';
import { DataService, Person } from '../../core-tab/lexical-entry-core-form/data.service';

@Component({
  selector: 'app-lexical-entry-decomp-form',
  templateUrl: './lexical-entry-decomp-form.component.html',
  styleUrls: ['./lexical-entry-decomp-form.component.scss']
})
export class LexicalEntryDecompFormComponent implements OnInit {

  @Input() decData: any;
  private subterm_subject: Subject<any> = new Subject();
  private corresponds_subject : Subject<any> = new Subject();
  private update_component_subject : Subject<any> = new Subject();
  switchInput = false;
  subscription: Subscription;
  object: any;
  people: Person[] = [];
  searchResults = [];
  peopleLoading = false;
  counter = 0;
  componentRef: any;
  
  subtermDisabled = false;
  memorySubterm = [];
  memoryComponent = [];
  memoryValues = [];

  decompForm = new FormGroup({
    label: new FormControl(''),
    component: new FormArray([this.createComponent()]),
    subterm: new FormArray([this.createSubterm()])
  })

  componentArray: FormArray;
  subtermArray: FormArray;

  staticMorpho = [];
  morphologyData = [];
  valueTraits = [];

  disableAddTraits = [];

  constructor(private dataService: DataService, private lexicalService: LexicalEntriesService, private formBuilder: FormBuilder, private toastr: ToastrService) { }

  ngOnInit(): void {

    this.decompForm = this.formBuilder.group({
      label: '',
      component: this.formBuilder.array([]),
      subterm : this.formBuilder.array([]),
    })
    this.triggerTooltip();
    this.loadMorphologyData();

    this.lexicalService.changeDecompLabel$.subscribe(
      data=>{
        if(data!=null){
          this.decompForm.get('label').setValue(data, { emitEvent: false });
        }
      }
    )

    this.subterm_subject.pipe(debounceTime(1000)).subscribe(
      data => {
          this.onSearchFilter(data)
      }
    )

    this.corresponds_subject.pipe(debounceTime(1000)).subscribe(
      data => {
          this.onSearchFilter(data)
      }
    )

    this.update_component_subject.pipe(debounceTime(1000)).subscribe(
      data => {
          this.onChanges(data)
      }
    )
  }

  triggerTooltip() {
    setTimeout(() => {
      //@ts-ignore
      $('.vartrans-tooltip').tooltip({
        trigger: 'hover'
      });
    }, 500);
  }

  loadMorphologyData() {
    this.lexicalService.getMorphologyData().subscribe(
        data => {
          console.log(data)
            this.morphologyData = data;
                      
        }
    )
  }

  ngOnChanges(changes: SimpleChanges) {
    setTimeout(() => {
      if (this.object != changes.decData.currentValue) {
        if (this.componentArray != null || this.subtermArray != null) {
          if(this.componentArray != undefined){
            this.componentArray.clear();
            
          }

          if(this.subtermArray != undefined){
            this.subtermArray.clear();
          }
          
          this.subtermDisabled = false;
          this.memorySubterm = [];
          this.memoryComponent = [];
          this.morphologyData = [];
          /* this.staticMorpho = []; */
          this.valueTraits = [];
          this.memoryValues = [];
        }
      }
      /* this.loadPeople(); */
      this.object = changes.decData.currentValue;
      if (this.object != null) {
        this.decompForm.get('label').setValue(this.object.label, { emitEvent: false });

        //TODO: get subterm inserire memory subterm
        if(this.object.lexicalEntryInstanceName != undefined && this.object.sense == undefined){
          this.lexicalService.getSubTerms(this.object.lexicalEntryInstanceName).subscribe(
            data=>{
              console.log(data)
            },error=>{
              console.log(error)
            }
          )
        }

        //TODO: get constituents inserire memory components
        if(this.object.lexicalEntryInstanceName != undefined && this.object.sense == undefined){
          this.lexicalService.getConstituents(this.object.lexicalEntryInstanceName).subscribe(
            data=>{
              console.log(data)
            },error=>{
              console.log(error)
            }
          )
        }

        //TODO: all'interno dei constituents caricare i dati morfologici
        
        
      }
      this.triggerTooltip();
    }, 10)
  }

  /* private loadPeople() {
    this.peopleLoading = true;
    this.dataService.getPeople().subscribe(x => {
      this.people = x;
      this.peopleLoading = false;
    });
  } */

  onChanges(data){
    let fieldType = '';
    console.log(data)
    if(data != undefined){
      
      let newValue = data.v.target.value;
      let currentValue;
      let index = data?.i;

      if(newValue.length > 2){
        let oldValue = '';
        fieldType = data['f']
        if(fieldType == 'note'){
          oldValue = this.memoryComponent[index]['note'];
        }else if(fieldType == 'label'){
          oldValue = this.memoryComponent[index]['label'];
        }
        
        //this.biblioArray = this.bibliographyForm.get('bibliography') as FormArray;

        

        let instanceName = this.memoryComponent[index].id;
        

        let parameters;

        if(oldValue == ''){
          parameters = {
            type: "decomp",
            relation: fieldType,
            value : newValue
          }
        }else{
          parameters = {
            type: "decomp",
            relation: fieldType,
            value : newValue,
            currentValue : oldValue
          }
        }
        
        
        
        //console.log(this.componentArray.at(index))
        console.log(parameters)

        this.lexicalService.updateGenericRelation(instanceName, parameters).subscribe(
          data=> {
            console.log(data);
            this.lexicalService.spinnerAction('off');
            this.lexicalService.updateLexCard(this.object);
            this.toastr.success('Component updated', '', {
              timeOut: 5000,
            });
          },error=> {
            console.log(error);
            this.lexicalService.updateLexCard({ lastUpdate: error.error.text })
            this.lexicalService.spinnerAction('off');
            if(error.status == 200){
              this.toastr.success('Component item updated', '', {
                timeOut: 5000,
              });
            }else{
              this.toastr.error(error.error, 'Error', {
                timeOut: 5000,
              });
            }
            
          }
        )

        
        if(fieldType == 'note'){
          this.memoryComponent[index]['note'] = newValue;
        }else if(fieldType == 'label'){
          this.memoryComponent[index].label = newValue;
        }
        
      }else{
        this.lexicalService.spinnerAction('off');
        this.toastr.error("Insert at leat 3 characters", 'Error', {
          timeOut: 5000,
        });
      }
      
    }
  }

  onChangeValue(i, j) {
    this.lexicalService.spinnerAction('on');
    const control = (<FormArray>this.decompForm.controls['component']).at(i).get('relation') as FormArray;
    
    const trait = control.at(j).get('trait').value;
    const value = control.at(j).get('value').value;
  
    if (trait != '' && value != '') {
        let parameters;
        if (this.memoryValues[i][j] == "") {
            parameters = {
                type: "morphology",
                relation: trait,
                value: value
            }
        } else {
            parameters = {
                type: "morphology",
                relation: trait,
                value: value,
                currentValue: this.memoryValues[i]
            }
        }

       
       /*  if(this.staticMorpho[i] == undefined){
          this.staticMorpho[i] = [];

        }
        this.staticMorpho[i][j].push({ trait: trait, value: value }) */
        let compId = this.memoryComponent[i].componentInstanceName;

        this.lexicalService.updateLinguisticRelation(compId, parameters).pipe(debounceTime(1000)).subscribe(
            data => {
                //console.log(data)
                data['request'] = 0;
                this.lexicalService.refreshAfterEdit(data);
                this.lexicalService.spinnerAction('off');
                this.lexicalService.refreshFilter({ request: true })
                this.lexicalService.updateLexCard(data)

                this.memoryComponent[i].morphology[j] = trait
                control.at(j).patchValue({trait : trait, value : value})
                this.disableAddTraits[i] = false;
                setTimeout(() => {
                    
                    let traitDescription = '';
                    this.morphologyData.filter(x => {
                        if (x.propertyId == trait && trait != 'partOfSpeech') {
                            x.propertyValues.filter(y => {
                                if(y.valueId == value){
                                    traitDescription = y.valueDescription;
                                    return true;
                                }else{
                                    return false;
                                }
                            })
                            return true;
                        } else {
                            return false;
                        }
                    })

                    //@ts-ignore
                    $('.trait-tooltip').tooltip({
                        trigger: 'hover'
                    });
                    
                    
                }, 1000);
            },
            error => {
                //console.log(error)
                this.lexicalService.refreshAfterEdit({ request: 0, label: this.object.label });
                this.lexicalService.spinnerAction('off');
                this.lexicalService.refreshFilter({ request: true })
                this.lexicalService.updateLexCard({ lastUpdate: error.error.text })
                
                this.memoryComponent[i].morphology[j] = trait
                control.at(j).patchValue({trait : trait, value : value})
                this.disableAddTraits[i] = false;
                setTimeout(() => {
                    
                    let traitDescription = '';
                    this.morphologyData.filter(x => {
                        if (x.propertyId == trait && trait != 'partOfSpeech') {
                            x.propertyValues.filter(y => {
                                if(y.valueId == value){
                                    traitDescription = y.valueDescription;
                                    return true;
                                }else{
                                    return false;
                                }
                            })
                            return true;
                        } else {
                            return false;
                        }
                    })

                    
                    
                    //@ts-ignore
                    $('.trait-tooltip').tooltip({
                        trigger: 'hover'
                    });
                    if(typeof(error.error) != 'object'){
                        this.toastr.error(error.error, 'Error', {
                          timeOut: 5000,
                        });
                    }else{
                        this.toastr.success('Morphotraits changed correctly for ' + compId, '', {
                            timeOut: 5000,
                        });
                    }
                    
                }, 1000);
            }
        )
    } else {
        this.lexicalService.spinnerAction('off');
        this.disableAddTraits[i] = false;
    }
}

  onChangeTrait(evt, i, j) {

    if (evt.target != undefined) {
        setTimeout(() => {
          const control = (<FormArray>this.decompForm.controls['component']).at(i).get('relation') as FormArray;
          //const trait = control.at(j).get('trait').value;
          //const value = control.at(j).get('value').value;
          //this.componentArray = this.decompForm.get('component') as FormArray;
          control.at(j).patchValue({ trait: evt.target.value, value: "" });
          if (evt.target.value != '') {
              let arrayValues = this.morphologyData.filter(x => {
                  return x['propertyId'] == evt.target.value;
              })['0']['propertyValues'];
              this.valueTraits[i][j] = arrayValues;
              this.memoryComponent[i].morphology[j] = evt.target.value;
              this.memoryValues[i][j] = "";
          } else {
              this.memoryValues.splice(i, 1);
              let arrayValues = [];
              this.valueTraits[i][j] = arrayValues
              this.memoryComponent[i]['morphology'][j].splice(j, 1)
          }
        }, 500);
    } else {

        var that = this;
        var timer = setInterval((val)=>{                
            
            try{
                var arrayValues = this.morphologyData.filter(x => {
                    return x['propertyId'] == evt;
                })['0']['propertyValues'];
                this.valueTraits[i][j] = arrayValues;
                this.memoryComponent[i].morphology[j].push(evt);
                clearInterval(timer)
            }catch(e){
                console.log(e)
            }
                
                   
        }, 500)

    }
}

  addSubterm() {
    this.subtermArray = this.decompForm.get('subterm') as FormArray;
    this.subtermArray.push(this.createSubterm());
    this.subtermDisabled = true;
   }

  addComponent() { 
    
    if(this.object.lexicalEntryInstanceName != undefined){
      let instance = this.object.lexicalEntryInstanceName;
      this.lexicalService.createComponent(instance).subscribe(
        data=>{
          console.log(data)

          //TODO: assegnare id a componente
          let compId = data.componentInstanceName;
          let componentURI = data.component;
          let creator = data.creator;
          let label = data.label;
          let creationDate = data.creationDate;
          let lastUpdate = data.lastUpdate;
          let morphology = data.morphology;
          let note = data.note;
          let position = data.position;

          this.componentArray = this.decompForm.get('component') as FormArray;
          this.componentArray.push(this.createComponent(compId, componentURI, creator, label, creationDate, lastUpdate, [], note, position));
          
          data['morphology'] = [];
          this.memoryComponent.push(data)
        },error=>{
          console.log(error)
        }
      )
    }
  }

  removeComponent(index){
    this.componentArray = this.decompForm.get('component') as FormArray;
    const control = this.componentArray.at(index);

    if(control != null){
      let idComp = control.get('id').value;
      
      this.lexicalService.deleteComponent(idComp).subscribe(
        data=>{
          console.log(data)
        },error=>{
          console.log(error)
        }
      )
    }

   

    this.memoryComponent.splice(index, 1)
    this.componentArray.removeAt(index);
  }

  addRelation(index){
    this.memoryComponent[index].morphology.push('');

    if(this.valueTraits[index] == undefined){
      this.valueTraits[index] = [];
      this.valueTraits[index].push([])
    }else{
      this.valueTraits[index].push([])
    }

    if(this.memoryValues[index] == undefined){
      this.memoryValues[index] = [];
      this.memoryValues[index].push([]);
    }else{
      this.memoryValues[index].push([]);
    }

    if(this.disableAddTraits[index] == undefined){
      this.disableAddTraits[index] = true;
    }else{
      this.disableAddTraits[index] = true;
    }
    

    const control = (<FormArray>this.decompForm.controls['component']).at(index).get('relation') as FormArray;
    control.push(this.createRelation());

    
    
  }

  removeRelation(ix, iy){
    const control = (<FormArray>this.decompForm.controls['component']).at(ix).get('relation') as FormArray;

    this.memoryComponent[ix].morphology.splice(iy, 1);
    this.valueTraits[ix].splice(iy, 1);
    this.memoryValues[ix].splice(iy, 1);
   /*  this.staticMorpho[ix].splice(iy, 1); */
    control.removeAt(iy);
  }

  addSubtermElement(index){
    const control = (<FormArray>this.decompForm.controls['subterm']).at(index).get('subterm_array') as FormArray;
    control.push(this.createSubtermComponent());
  }

  removeSubtermElement(ix, iy){
    const control = (<FormArray>this.decompForm.controls['subterm']).at(ix).get('subterm_array') as FormArray;
    let value = control.at(iy).get('entity').value;

    if(this.object.lexicalEntryInstanceName != null && value == ""){
      let instance = this.object.lexicalEntryInstanceName;
      
      let parameters = {
        relation : 'subterm',
        value : value
      }
      this.lexicalService.deleteLinguisticRelation(instance, parameters).subscribe(
        data=>{
          console.log(data)
          this.toastr.success('Subterm removed ', '', {
            timeOut: 5000,
        });
        },
        error=>{
          console.log(error)
          this.toastr.error(error.error, 'Error', {
            timeOut: 5000,
          });
          //TODO: inserire toastr
        }
      )
    }

    control.removeAt(iy);

    this.memorySubterm.splice(ix, 1)
    

  }

  triggerSubterm(evt) {
    console.log(evt)
    if (evt.target != undefined) {
        
        this.subterm_subject.next(evt.target.value)
    }
  }

  triggerCorrespondsTo(evt) {
    console.log(evt)
    if (evt.target != undefined) {
        
        this.corresponds_subject.next(evt.target.value)
    }
  }

  removeSubterm(index){
    this.componentArray = this.decompForm.get('subterm') as FormArray;
    this.componentArray.removeAt(index);
    this.subtermDisabled = false;
  }

  createRelation(){
    return this.formBuilder.group({
      trait: '',
      value: ''
    })
  }

  removeSubtermComponent(ix, iy){
    const control = (<FormArray>this.decompForm.controls['component']).at(ix).get('sub_term') as FormArray;
    control.removeAt(iy);
  }

  removeCorrespondsToComponent(ix, iy){
    const control = (<FormArray>this.decompForm.controls['component']).at(ix).get('corresponds_to') as FormArray;
    control.removeAt(iy);
  }

  createComponent(compId?, componentURI?, creator?, label?, creationDate?, lastUpdate?, morphology?, note?, position?) {
    if(compId == undefined){
      return this.formBuilder.group({
        id : new FormControl(''),
        uri : new FormControl(''),
        creator : new FormControl(''),
        label : new FormControl(''),
        creationDate : new FormControl(''),
        lastUpdate : new FormControl(''),
        relation: new FormArray([]),
        note : new FormControl(''),
        corresponds_to: new FormControl(''),
        position : new FormControl('')
      })
    }else{
      return this.formBuilder.group({
        id : new FormControl(compId),
        uri : new FormControl(componentURI),
        creator : new FormControl(creator),
        label : new FormControl(label),
        creationDate : new FormControl(creationDate),
        lastUpdate : new FormControl(lastUpdate),
        relation: new FormArray([]),
        note : new FormControl(note),
        corresponds_to: new FormControl(null),
        position : new FormControl(position)
      })
    }
    
  }

  createSubtermComponent() {
    return this.formBuilder.group({
      entity: ''
    })
  }

  createSubterm() {
    return this.formBuilder.group({
      subterm_array : new FormArray([this.createSubtermComponent()])
    })
  }

  handleSubterm(evt, i) {

    if (evt instanceof NgSelectComponent) {
        if (evt.selectedItems.length > 0) {
            console.log(evt.selectedItems[0])
            let label = evt.selectedItems[0]['value']['lexicalEntryInstanceName'];
            this.onChangeSubterm({ name: label, i: i })
        }
    } /* else {
        let label = evt.target.value;
        this.Subterm_subject.next({ name: label, i: i })
    } */
  }

  handleCorrespondsTo(evt, i) {

    if (evt instanceof NgSelectComponent) {
        if (evt.selectedItems.length > 0) {
            console.log(evt.selectedItems[0])
            let label = evt.selectedItems[0]['value']['lexicalEntryInstanceName'];
            this.onChangeCorrespondsTo({ name: label, i: i })
        }
    } /* else {
        let label = evt.target.value;
        this.Subterm_subject.next({ name: label, i: i })
    } */
  }

  debounceKeyup(evt, index, field){
    this.update_component_subject.next({v: evt, i: index, f: field})
  }

  onChangeSubterm(data) {
    var index = data['i'];
    this.subtermArray = this.decompForm.get("subterm") as FormArray;
    if (this.memorySubterm[index] == undefined) {
        const newValue = data['name']
        const parameters = {
            type: "decomp",
            relation: "subTerm",
            value: newValue
        }
        console.log(parameters)
        let lexId = this.object.lexicalEntryInstanceName;
        this.lexicalService.updateLinguisticRelation(lexId, parameters).subscribe(
            data => {
                console.log(data);
                this.lexicalService.spinnerAction('off');
                data['request'] = 0;
                this.lexicalService.refreshAfterEdit(data);
                this.lexicalService.updateLexCard(data)
            }, error => {
                console.log(error)

                /* this.toastr.error(error.error, 'Error', {
                    timeOut: 5000,
                }); */
                this.lexicalService.updateLexCard({ lastUpdate: error.error.text })
                this.lexicalService.spinnerAction('off');
                if(error.status == 200){
                    this.toastr.success('Subterm changed correctly for ' + lexId, '', {
                        timeOut: 5000,
                    });
                }else{
                    this.toastr.error(error.error, 'Error', {
                        timeOut: 5000,
                      });
                    
                }
            }
        )
        this.memorySubterm[index] = data;


    } else {
        const oldValue = this.memorySubterm[index]['lexicalEntity']
        const newValue = data['name']
        const parameters = {
            type: "decomp",
            relation: "subTerm",
            value: newValue,
            currentValue: oldValue
        }
       
        let lexId = this.object.lexicalEntryInstanceName;
        console.log(parameters)
        this.lexicalService.updateLinguisticRelation(lexId, parameters).subscribe(
            data => {
                console.log(data);
                this.lexicalService.spinnerAction('off');
                this.lexicalService.updateLexCard(data)
                data['request'] = 0;
                this.lexicalService.refreshAfterEdit(data);
            }, error => {
                console.log(error)
                const data = this.object;
                data['request'] = 0;
                
                //this.lexicalService.refreshAfterEdit(data);
                this.lexicalService.updateLexCard({ lastUpdate: error.error.text })
                this.lexicalService.spinnerAction('off');
                if(error.status == 200){
                    this.toastr.success('Label changed correctly for ' + lexId, '', {
                        timeOut: 5000,
                    });
                }else{
                    this.toastr.error(error.error, 'Error', {
                        timeOut: 5000,
                      });
                }
            }
        )
        this.memorySubterm[index] = data;
    }


  }


  onChangeCorrespondsTo(data) {
    var index = data['i'];
    this.subtermArray = this.decompForm.get("subterm") as FormArray;
    if (this.memoryComponent[index].corresponds_to == undefined) {
        const newValue = data['name']
        const parameters = {
            type: "decomp",
            relation: "correspondsTo",
            value: newValue
        }
        console.log(parameters)
        let lexId = this.object.lexicalEntryInstanceName;
        this.lexicalService.updateLinguisticRelation(lexId, parameters).subscribe(
            data => {
                console.log(data);
                this.lexicalService.spinnerAction('off');
                data['request'] = 0;
                this.lexicalService.refreshAfterEdit(data);
                this.lexicalService.updateLexCard(data)
            }, error => {
                console.log(error)

                /* this.toastr.error(error.error, 'Error', {
                    timeOut: 5000,
                }); */
                this.lexicalService.updateLexCard({ lastUpdate: error.error.text })
                this.lexicalService.spinnerAction('off');
                if(error.status == 200){
                    this.toastr.success('Subterm changed correctly for ' + lexId, '', {
                        timeOut: 5000,
                    });
                }else{
                    this.toastr.error(error.error, 'Error', {
                        timeOut: 5000,
                      });
                    
                }
            }
        )
        this.memoryComponent[index].corresponds_to = data;


    } else {
        const oldValue = this.memoryComponent[index]['lexicalEntity']
        const newValue = data['name']
        const parameters = {
            type: "decomp",
            relation: "correspondsTo",
            value: newValue,
            currentValue: oldValue
        }
       
        let lexId = this.object.lexicalEntryInstanceName;
        console.log(parameters)
        this.lexicalService.updateLinguisticRelation(lexId, parameters).subscribe(
            data => {
                console.log(data);
                this.lexicalService.spinnerAction('off');
                this.lexicalService.updateLexCard(data)
                data['request'] = 0;
                this.lexicalService.refreshAfterEdit(data);
            }, error => {
                console.log(error)
                const data = this.object;
                data['request'] = 0;
                
                //this.lexicalService.refreshAfterEdit(data);
                this.lexicalService.updateLexCard({ lastUpdate: error.error.text })
                this.lexicalService.spinnerAction('off');
                if(error.status == 200){
                    this.toastr.success('Label changed correctly for ' + lexId, '', {
                        timeOut: 5000,
                    });
                }else{
                    this.toastr.error(error.error, 'Error', {
                        timeOut: 5000,
                      });
                }
            }
        )
        this.memoryComponent[index].corresponds_to = data;
    }


  }

  onSearchFilter(data) {
    this.searchResults = [];
    
    if (this.object.lexicalEntryInstanceName != undefined) {
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
        
        /* && data.length >= 3 */
        this.lexicalService.getLexicalEntriesList(parameters).subscribe(
            data => {
                console.log(data)

                
                this.searchResults = data['list'];
                
            }, error => {
                console.log(error)
            }
        )
        
    } else {
    }
    
}

  deleteData() {
      this.searchResults = [];
  }

}
