/*
  © Copyright 2021-2022  Istituto di Linguistica Computazionale "A. Zampolli", Consiglio Nazionale delle Ricerche, Pisa, Italy.
 
This file is part of EpiLexo.

EpiLexo is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

EpiLexo is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with EpiLexo. If not, see <https://www.gnu.org/licenses/>.
*/

import { ChangeDetectorRef, Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { DataService, Person } from './data.service';
import { LexicalEntriesService } from '../../../../../../services/lexical-entries/lexical-entries.service';
import { Subject, Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';


import { FormBuilder, FormGroup, FormArray, FormControl, Validators, Form } from '@angular/forms';
import { debounceTime } from 'rxjs/operators';
import { NgSelectComponent } from '@ng-select/ng-select';


@Component({
    selector: 'app-lexical-entry-core-form',
    templateUrl: './lexical-entry-core-form.component.html',
    styleUrls: ['./lexical-entry-core-form.component.scss']
})
export class LexicalEntryCoreFormComponent implements OnInit {

    @Input() lexData: any;

    private subject: Subject<any> = new Subject();
    switchInput = false;
    subscription: Subscription;
    object: any;
    people: Person[] = [];
    peopleLoading = false;
    counter = 0;
    lexEntryTypesData = [];
    morphologyData = [];
    valueTraits = [];
    memoryTraits = [];
    memoryValues = [];
    languages = [];

    memoryDenotes = [];
    memoryCognates = [];
    memoryEvokes = [];

    valuePos = [];
    memoryPos = '';

    posDescription = '';
    typeDesc = '';
    staticMorpho = [];

    interval;

    searchResults: [];
    filterLoading = false;

    private denotes_subject: Subject<any> = new Subject();
    private cognates_subject: Subject<any> = new Subject();
    private evokes_subject: Subject<any> = new Subject();

    /* public urlRegex = /(^|\s)((https?:\/\/)?[\w-]+(\.[\w-]+)+\.?(:\d+)?(\/\S*)?)/gi */
    public urlRegex = /(^|\s)((https?:\/\/.+))/;

    emptyLabelFlag = false;
    emptyFlag = false;

    coreForm = new FormGroup({
        label: new FormControl('', [Validators.required, Validators.minLength(3)]),
        type: new FormControl(''),
        language: new FormControl('', [Validators.required, Validators.minLength(0)]),
        pos: new FormControl(''),
        morphoTraits: new FormArray([this.createMorphoTraits()]),
        evokes: new FormArray([this.createEvokes()]),
        denotes: new FormArray([this.createDenotes()]),
        cognate : new FormArray([this.createCognates()]),
        isCognate : new FormControl(null)
    })

    morphoTraits: FormArray;
    evokesArray: FormArray;
    denotesArray: FormArray;
    cognatesArray: FormArray;

    constructor(private lexicalService: LexicalEntriesService, private formBuilder: FormBuilder, private toastr: ToastrService) {

    }

    ngOnInit() {
        /* setTimeout(() => {
            //@ts-ignore
            $('.denotes-tooltip').tooltip({
                trigger: 'hover'
            });
        }, 1000); */


       

        this.denotes_subject.pipe(debounceTime(1000)).subscribe(
            data => {
                this.onChangeDenotes(data)
            }
        )

        this.cognates_subject.pipe(debounceTime(1000)).subscribe(
            data => {
                this.onChangeCognates(data)
            }
        )

        /* this.evokes_subject.pipe(debounceTime(1000)).subscribe(
            data => {
                this.onChangeEvokes(data)
            }
        ) */

        this.lexicalService.updateLangSelect$.subscribe(
            signal => {
        
                if(signal != null){
                    
                    this.languages = [];
                    this.lexicalService.getLexiconLanguages().subscribe(
                        data => {
                            console.log(data)
                            for (var i = 0; i < data.length; i++) {
                                this.languages[i] = data[i]
                            }
                        }
                    );
                }
            }
        );

        this.lexicalService.getLexiconLanguages().subscribe(
            data => {
                this.languages = [];
                for (var i = 0; i < data.length; i++) {
                    this.languages[i] = data[i]
                }
            }
        );

        this.subject.pipe(debounceTime(1000)).subscribe(
            data => {
                this.onSearchFilter(data)
            }
        )

        this.loadMorphologyData();
        this.loadLexEntryTypeData();

        this.coreForm = this.formBuilder.group({
            label: '',
            type: '',
            language: '',
            pos: '',
            morphoTraits: this.formBuilder.array([]),
            evokes: this.formBuilder.array([this.createEvokes()]),
            denotes: this.formBuilder.array([this.createDenotes()]),
            cognate: this.formBuilder.array([this.createCognates()]),
            isCognate : false
        })

        this.onChanges();
    }

    /* triggerDenotes(evt) {
        if (evt.target != undefined) {
            this.subject.next(evt.target.value)
        }
    } */

    triggerCognates(evt) {
        console.log(evt)
        if (evt.target != undefined) {
            
            this.subject.next(evt.target.value)
        }
    }

    loadLexEntryTypeData() {
        this.lexicalService.getLexEntryTypes().subscribe(
            data => {
                this.lexEntryTypesData = data;
                
            }
        )
    }

    onSearchFilter(data) {
        this.filterLoading = true;
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

                    let filter_lang = data.list.filter(
                        x => {
                            return x.language != this.object.language;
                        }
                    )
                    filter_lang.forEach(element => {
                        element['label_lang'] = element.label+"@"+element.language
                    });
                    console.log(filter_lang)
                    this.searchResults = data['list']
                    this.filterLoading = false;
                }, error => {
                    //console.log(error)
                    this.filterLoading = false;
                }
            )
            
        } else {
            this.filterLoading = false;
        }
        
    }

    deleteData() {
        this.searchResults = [];
    }

    loadMorphologyData() {
        this.lexicalService.getMorphologyData().subscribe(
            data => {
                this.morphologyData = data;
                /* //console.log(this.morphologyData) */
                this.valuePos = this.morphologyData.filter(x => {
                    if (x.propertyId == 'partOfSpeech') {
                        return true;
                    } else {
                        return false;
                    }
                })

                this.valuePos = this.valuePos[0]['propertyValues'];
                
            }
        )
    }


    ngOnChanges(changes: SimpleChanges) {
        setTimeout(() => {
            if (this.object != changes.lexData.currentValue) {
                this.morphoTraits = this.coreForm.get('morphoTraits') as FormArray;
                this.morphoTraits.clear();

                this.denotesArray = this.coreForm.get('denotes') as FormArray;
                this.denotesArray.clear();

                this.cognatesArray = this.coreForm.get('cognate') as FormArray;
                this.cognatesArray.clear();

                this.evokesArray = this.coreForm.get('evokes') as FormArray;
                this.evokesArray.clear();

                this.memoryPos = '';

                this.staticMorpho = []
            }
            this.object = changes.lexData.currentValue;

            
            if (this.object != null) {
                
                const lexId = this.object.lexicalEntryInstanceName;
                this.coreForm.get('label').setValue(this.object.label, { emitEvent: false });
                if(this.object.type == 'Etymon'){
                    this.coreForm.get('type').disable({onlySelf: true, emitEvent: false})
                }else{
                    this.coreForm.get('type').enable({onlySelf: true, emitEvent: false})
                }

                this.object.type.forEach(element => {
                    if(element != 'Cognate'){
                        this.coreForm.get('type').setValue(element, { emitEvent: false });
                        return true;
                    }else{
                        return false;
                    }
                });

                let isCognate = this.object.type.find(element => element == 'Cognate');
                if(isCognate){
                    this.coreForm.get('isCognate').setValue(true, {emitEvent: false})
                }else{
                    this.coreForm.get('isCognate').setValue(false, {emitEvent: false})
                }

                //this.coreForm.get('type').setValue(this.object.type, { emitEvent: false });
                this.coreForm.get('language').setValue(this.object.language, { emitEvent: false });
                this.coreForm.get('pos').setValue(this.object.pos, { emitEvent: false });

                this.memoryPos = this.object.pos;

                this.valueTraits = [];
                this.memoryTraits = [];
                this.memoryDenotes = [];
                this.memoryCognates = [];
                this.memoryValues = [];

               /*  //console.log('MORFOLOGIA')
                //console.log(this.object.morphology) */
                setTimeout(() => {
                    for (var i = 0; i < this.object.morphology.length; i++) {
                        const trait = this.object.morphology[i]['trait'];
                        const value = this.object.morphology[i]['value'];
                        
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
                        
                        this.memoryValues[i] = value;
                       
                        this.addMorphoTraits(trait, value, traitDescription);
                        this.onChangeTrait(trait, i);
    
                        this.staticMorpho.push({ trait: trait, value: value });
                        
                    }
                }, 100);
                

                setTimeout(() => {
                    let pos = this.coreForm.get('pos').value;
                    this.valuePos.forEach(el => {
                        if(el.valueId == pos){
                           
                            this.posDescription = el.valueDescription;
                        }
                    })
                    //@ts-ignore
                    $('.pos-tooltip').tooltip({
                        trigger: 'hover'
                    });
                    
                    
                }, 1000);

                setTimeout(() => {
                    
                    //@ts-ignore
                    $('.trait-tooltip').tooltip({
                        trigger: 'hover'
                    });
                    
                    
                }, 1000);

                setTimeout(() => {
                    let type = this.coreForm.get('type').value;
                    this.lexEntryTypesData.forEach(el => {
                        if(el.valueId == type){
                            
                            this.typeDesc = el.valueDescription;
                        }
                    })
                    //@ts-ignore
                    $('.type-tooltip').tooltip({
                        trigger: 'hover'
                    });
                    
                    
                }, 1000);

                this.lexicalService.getLexEntryLinguisticRelation(lexId, 'denotes').subscribe(
                    data => {
                        //console.log(data)
                        for (var i = 0; i < data.length; i++) {
                            let entity = data[i]['lexicalEntity'];
                            let type = data[i]['linkType'];
                            this.addDenotes(entity, type);
                            this.memoryDenotes.push(data[i])
                        }
                    }, error => {
                        //console.log(error)
                    }
                )
                
                this.lexicalService.getLexEntryLinguisticRelation(lexId, 'cognate').subscribe(
                    data => {
                        console.log(data)
                        for (var i = 0; i < data.length; i++) {
                            let entity = data[i]['lexicalEntity'];
                            let type = data[i]['linkType'];
                            this.addCognates(entity, type);
                            this.memoryCognates.push(data[i])
                        }
                    }, error => {
                        console.log(error)
                    }
                )
            }


        }, 10)

    }

    onChangeLanguage(evt) {

        this.lexicalService.spinnerAction('on');
        let langLabel = evt.target.value;
        let langValue;
        this.languages.forEach(element => {
            if (element['label'].toLowerCase() == langLabel.toLowerCase()) {
                langValue = element['label'];
                return;
            }
        });

        if (langValue != undefined) {
            let lexId = this.object.lexicalEntryInstanceName;
            let parameters = {
                relation: 'language',
                value: langValue
            }
          
            this.lexicalService.updateLexicalEntry(lexId, parameters).subscribe(
                data => {
                    //console.log(data)
                    this.lexicalService.spinnerAction('off');
                    this.lexicalService.updateLexCard(data)
                    data['request'] = 0;
                    data['new_lang'] = langValue.toLowerCase();
                    this.lexicalService.refreshAfterEdit(data);
                    this.lexicalService.refreshLangTable();
                    this.lexicalService.refreshFilter({ request: true })
                }, error => {
                    //console.log(error)
                    const data = this.object;
                    data['request'] = 0;
                    data['new_lang'] = langValue.toLowerCase();
                    this.lexicalService.refreshAfterEdit(data);
                    this.lexicalService.spinnerAction('off');
                    this.lexicalService.refreshLangTable();
                    this.lexicalService.refreshFilter({ request: true })
                    this.lexicalService.updateLexCard({ lastUpdate: error.error.text })
                    if(typeof(error.error) != 'object'){
                        this.toastr.error(error.error, 'Error', {
                          timeOut: 5000,
                        });
                    }else{
                        this.toastr.success('Language changed correctly for ' + lexId, '', {
                            timeOut: 5000,
                        });
                    }
                }
            )
        } else {
            this.lexicalService.spinnerAction('off');
        }

    }

    onChangePos(evt) {
        this.lexicalService.spinnerAction('on');
        let posValue = evt.target.value;
        let lexId = this.object.lexicalEntryInstanceName;
        let parameters;
        if (this.memoryPos == '') {

            parameters = {
                type: "morphology",
                relation: 'partOfSpeech',
                value: posValue
            }

        } else {
            parameters = {
                type: "morphology",
                relation: 'partOfSpeech',
                value: posValue,
                currentValue: this.memoryPos
            }
        }
        
        console.log(parameters)
        this.lexicalService.updateLinguisticRelation(lexId, parameters).pipe(debounceTime(1000)).subscribe(
            response => {
                console.log(response)
                this.memoryPos = posValue;
                let data= {};
                data['request'] = 0;
                data['new_pos'] = posValue;
                data['lexicalEntryInstanceName'] = this.object.lexicalEntryInstanceName;
                //this.lexicalService.updateLexCard(data)
                this.lexicalService.spinnerAction('off');
                this.lexicalService.refreshAfterEdit(data);
                this.lexicalService.refreshFilter({ request: true })
                
                setTimeout(() => {
                    
                    this.valuePos.forEach(el => {
                        if(el.valueId == posValue){
                            this.posDescription = el.valueDescription;
                        }
                    })
                    //@ts-ignore
                    $('.pos-tooltip').tooltip({
                        trigger: 'hover',
                    });

                }, 1000);
            },
            error => {
                console.log(error);
                this.memoryPos = posValue;
                this.lexicalService.spinnerAction('off');
                const data = this.object;
                data['request'] = 0;
                data['new_pos'] = posValue;
                this.lexicalService.refreshAfterEdit(data);
                this.lexicalService.refreshFilter({ request: true })
                this.lexicalService.updateLexCard({ lastUpdate: error.error.text })
                if(typeof(error.error) != 'object'){
                    this.toastr.error(error.error, 'Error', {
                      timeOut: 5000,
                    });
                }else{
                    this.toastr.success('Pos changed correctly for ' + lexId, '', {
                        timeOut: 5000,
                    });
                }
                setTimeout(() => {
                    
                    this.valuePos.forEach(el => {
                        if(el.valueId == posValue){
                            this.posDescription = el.valueDescription;
                        }
                    })
                    //@ts-ignore
                    $('.pos-tooltip').tooltip({
                        trigger: 'hover'
                    });

                }, 1000);
            }
        )
        

    }

    onChangeExistingValue(evt, i) {
        this.lexicalService.spinnerAction('on');
        this.morphoTraits = this.coreForm.get('morphoTraits') as FormArray;
        const trait = this.morphoTraits.at(i).get('trait').value;
        const oldValue = this.morphoTraits.at(i).get('value').value;
        const newValue = evt.target.value;
        if (newValue != '') {
            let parameters = {
                type: "morphology",
                relation: trait,
                value: newValue,
                currentValue: oldValue
            }

            this.morphoTraits.at(i).get('value').setValue(newValue, { emitEvent: false });

            this.staticMorpho[i] = { trait: trait, value: newValue }
            let lexId = this.object.lexicalEntryInstanceName;

            this.lexicalService.updateLinguisticRelation(lexId, parameters).pipe(debounceTime(1000)).subscribe(
                data => {
                    //console.log(data)
                    data['request'] = 0;
                    this.lexicalService.refreshAfterEdit(data);
                    this.lexicalService.spinnerAction('off');
                    this.lexicalService.refreshFilter({ request: true })
                    this.lexicalService.updateLexCard(data)
                },
                error => {
                    //console.log(error)
                    this.lexicalService.refreshAfterEdit({ request: 0, label: this.object.label });
                    this.lexicalService.spinnerAction('off');
                    this.lexicalService.refreshFilter({ request: true })
                    this.lexicalService.updateLexCard({ lastUpdate: error.error.text })
                    if(typeof(error.error) != 'object'){
                        this.toastr.error(error.error, 'Error', {
                          timeOut: 5000,
                        });
                    }else{
                        this.toastr.success('Morphotraits changed correctly for ' + lexId, '', {
                            timeOut: 5000,
                        });
                    }
                }
            )

        } else {
            this.lexicalService.spinnerAction('on');
        }
    }

    onChangeValue(i) {
        this.lexicalService.spinnerAction('on');
        this.morphoTraits = this.coreForm.get('morphoTraits') as FormArray;
        const trait = this.morphoTraits.at(i).get('trait').value;
        const value = this.morphoTraits.at(i).get('value').value;
      
        if (trait != '' && value != '') {
            let parameters;
            if (this.memoryValues[i] == "") {
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

            this.staticMorpho.push({ trait: trait, value: value })
            let lexId = this.object.lexicalEntryInstanceName;

            this.lexicalService.updateLinguisticRelation(lexId, parameters).pipe(debounceTime(1000)).subscribe(
                data => {
                    //console.log(data)
                    data['request'] = 0;
                    this.lexicalService.refreshAfterEdit(data);
                    this.lexicalService.spinnerAction('off');
                    this.lexicalService.refreshFilter({ request: true })
                    this.lexicalService.updateLexCard(data)
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

                        this.morphoTraits = this.coreForm.get('morphoTraits') as FormArray;
                        this.morphoTraits.at(i).patchValue({ trait: trait, value: value, description: traitDescription });
                        
                        //@ts-ignore
                        $('.trait-tooltip').tooltip({
                            trigger: 'hover'
                        });
                        if(typeof(error.error) != 'object'){
                            this.toastr.error(error.error, 'Error', {
                              timeOut: 5000,
                            });
                        }else{
                            this.toastr.success('Morphotraits changed correctly for ' + lexId, '', {
                                timeOut: 5000,
                            });
                        }
                        
                    }, 1000);
                }
            )
        } else {
            this.lexicalService.spinnerAction('off');
        }
    }

    onChangeTrait(evt, i) {

        if (evt.target != undefined) {
            setTimeout(() => {
                this.morphoTraits = this.coreForm.get('morphoTraits') as FormArray;
                this.morphoTraits.at(i).patchValue({ trait: evt.target.value, value: "" });
                if (evt.target.value != '') {
                    let arrayValues = this.morphologyData.filter(x => {
                        return x['propertyId'] == evt.target.value;
                    })['0']['propertyValues'];
                    this.valueTraits[i] = arrayValues;
                    this.memoryTraits[i] = evt.target.value;
                    this.memoryValues[i] = "";
                } else {
                    this.memoryValues.splice(i, 1);
                    let arrayValues = [];
                    this.valueTraits[i] = arrayValues
                    this.memoryTraits.splice(i, 1)
                }
            }, 500);
        } else {

            var that = this;
            var timer = setInterval((val)=>{                
                
                try{
                    var arrayValues = this.morphologyData.filter(x => {
                        return x['propertyId'] == evt;
                    })['0']['propertyValues'];
                    this.valueTraits[i] = arrayValues;
                    this.memoryTraits.push(evt);
                    clearInterval(timer)
                }catch(e){
                    console.log(e)
                }
                    
                       
            }, 500)

        }
    }


    onChanges(): void {

        this.coreForm.get("label").valueChanges.pipe(debounceTime(1000)).subscribe(
            updatedLabel => {
                if (updatedLabel.length > 2 && updatedLabel.trim() != '') {
                    this.emptyLabelFlag = false;
                    this.lexicalService.spinnerAction('on');
                    let lexId = this.object.lexicalEntryInstanceName;
                    let parameters = {
                        relation: 'label',
                        value: updatedLabel
                    }
                    this.lexicalService.updateLexicalEntry(lexId, parameters).subscribe(
                        data => {
                            console.log(data);
                            data['request'] = 0;
                            data['new_label'] = updatedLabel
                            this.lexicalService.refreshAfterEdit(data);
                            this.lexicalService.spinnerAction('off');
                            this.lexicalService.updateLexCard(data)
                            
                        },
                        error => {
                            console.log(error);
                            const data = this.object;
                            data['request'] = 0;
                            data['new_label'] = updatedLabel;
                            this.lexicalService.refreshAfterEdit(data);
                            this.lexicalService.spinnerAction('off');
                            this.lexicalService.updateLexCard({ lastUpdate: error.error.text })
                            if(typeof(error.error) != 'object'){
                                this.toastr.error(error.error, 'Error', {
                                  timeOut: 5000,
                                });
                            }else{
                                this.toastr.success('Label changed correctly for ' + lexId, '', {
                                    timeOut: 5000,
                                });
                            }
                        }
                    )
                } else if (updatedLabel.length < 3) {
                    
                    this.emptyLabelFlag = true;
                }
            }
        )

        this.coreForm.get("type").valueChanges.pipe(debounceTime(200)).subscribe(
            newType => {
                this.lexicalService.spinnerAction('on');
                let lexId = this.object.lexicalEntryInstanceName;
                let parameters = {
                    relation: 'type',
                    value: newType
                }
                this.lexicalService.updateLexicalEntry(lexId, parameters).subscribe(
                    data => {
                        //console.log(data);
                        this.lexicalService.spinnerAction('off');
                        data['request'] = 0;
                        data['new_type'] = newType;
                        this.lexicalService.refreshAfterEdit(data);
                        this.lexicalService.refreshFilter({ request: true })
                        this.lexicalService.updateLexCard(data)

                        setTimeout(() => {
                            let type = this.coreForm.get('type').value;
                            this.lexEntryTypesData.forEach(el => {
                                if(el.valueId == type){
                                    
                                    this.typeDesc = el.valueDescription;
                                }
                            })
                            //@ts-ignore
                            $('.type-tooltip').tooltip({
                                trigger: 'hover'
                            });
                            
                            
                        }, 1000);
                        
                    },
                    error => {
                        //console.log(error);
                        const data = this.object;
                        data['request'] = 0;
                        data['new_type'] = newType;
                        this.lexicalService.refreshAfterEdit(data);
                        this.lexicalService.spinnerAction('off');
                        this.lexicalService.updateLexCard({ lastUpdate: error.error.text })
                        this.lexicalService.refreshFilter({ request: true })
                        if(typeof(error.error) != 'object'){
                            this.toastr.error(error.error, 'Error', {
                              timeOut: 5000,
                            });
                        }else{
                            this.toastr.success('Type changed correctly for ' + lexId, '', {
                                timeOut: 5000,
                            });
                        }
                        setTimeout(() => {
                            let type = this.coreForm.get('type').value;
                            this.lexEntryTypesData.forEach(el => {
                                if(el.valueId == type){
                                    
                                    this.typeDesc = el.valueDescription;
                                }
                            })
                            //@ts-ignore
                            $('.type-tooltip').tooltip({
                                trigger: 'hover'
                            });
                            
                            
                        }, 1000);
                    }
                )
            }
        )
    }

    createMorphoTraits(t?, v?, d?): FormGroup {
        if (t != undefined) {
            return this.formBuilder.group({
                trait: new FormControl(t, [Validators.required, Validators.minLength(0)]),
                value: new FormControl(v, [Validators.required, Validators.minLength(0)]),
                description : new FormControl(d, [Validators.required, Validators.minLength(0)]),
            })
        } else {
            return this.formBuilder.group({
                trait: new FormControl('', [Validators.required, Validators.minLength(0)]),
                value: new FormControl('', [Validators.required, Validators.minLength(0)]),
                description : new FormControl(null, [Validators.required, Validators.minLength(0)])
            })
        }
    }

    createEvokes(e?): FormGroup {

        if (e != undefined) {
            return this.formBuilder.group({
                entity: new FormControl(e, [Validators.required, Validators.pattern(this.urlRegex)])
            })
        } else {
            return this.formBuilder.group({
                entity: new FormControl('', [Validators.required, Validators.pattern(this.urlRegex)])
            })
        }
    }

    createDenotes(e?, t?): FormGroup {
        if (e != undefined) {
            return this.formBuilder.group({
                entity: new FormControl(e, [Validators.required, Validators.pattern(this.urlRegex)]),
                type: t
            })
        } else {
            return this.formBuilder.group({
                entity: new FormControl(null, [Validators.required, Validators.pattern(this.urlRegex)]),
                type: null
            })
        }
    }

    createCognates(e?, t?): FormGroup {
        if (e != undefined) {
            return this.formBuilder.group({
                entity: new FormControl(e, [Validators.required, Validators.pattern(this.urlRegex)]),
                type: t
            })
        } else {
            return this.formBuilder.group({
                entity: new FormControl(null, [Validators.required, Validators.pattern(this.urlRegex)]),
                type: null
            })
        }
    }


    handleDenotes(evt, i) {

        if (evt instanceof NgSelectComponent) {
            if (evt.selectedItems.length > 0) {
                let label = evt.selectedItems[0]['value']['lexicalEntry'];
                this.onChangeDenotes({ name: label, i: i })
            }
        } else {
            let label = evt.target.value;
            this.denotes_subject.next({ name: label, i: i })
        }
    }

    handleCognates(evt, i) {

        if (evt instanceof NgSelectComponent) {
            if (evt.selectedItems.length > 0) {
                console.log(evt.selectedItems[0])
                let label = evt.selectedItems[0]['value']['lexicalEntryInstanceName'];
                this.onChangeCognates({ name: label, i: i })
            }
        } else {
            let label = evt.target.value;
            this.cognates_subject.next({ name: label, i: i })
        }
    }

    onChangeDenotes(data) {
        var index = data['i'];
        this.denotesArray = this.coreForm.get("denotes") as FormArray;
        if (this.memoryDenotes[index] == undefined) {
            const newValue = data['name']
            const parameters = {
                type: "conceptRef",
                relation: "denotes",
                value: newValue
            }
            //console.log(parameters)
            let lexId = this.object.lexicalEntryInstanceName;
            this.lexicalService.updateLinguisticRelation(lexId, parameters).subscribe(
                data => {
                    //console.log(data);
                    this.lexicalService.spinnerAction('off');
                    data['request'] = 0;
                    this.lexicalService.refreshAfterEdit(data);
                    this.lexicalService.updateLexCard(data)
                }, error => {
                    //console.log(error)

                    /* this.toastr.error(error.error, 'Error', {
                        timeOut: 5000,
                    }); */
                    this.lexicalService.updateLexCard({ lastUpdate: error.error.text })
                    
                    this.lexicalService.spinnerAction('off');
                    if(error.status == 200){
                        this.toastr.success('Denotes changed correctly for ' + lexId, '', {
                            timeOut: 5000,
                        });
                    }else{
                        this.toastr.error(error.error, 'Error', {
                            timeOut: 5000,
                        });
                        
                    }
                }
            )
            this.memoryDenotes[index] = data;


        } else {
            const oldValue = this.memoryDenotes[index]['lexicalEntity']
            const newValue = data['name']
            const parameters = {
                type: "conceptRef",
                relation: "denotes",
                value: newValue,
                currentValue: oldValue
            }
           
            let lexId = this.object.lexicalEntryInstanceName;
            //console.log(parameters)
            this.lexicalService.updateLinguisticRelation(lexId, parameters).subscribe(
                data => {
                    //console.log(data);
                    this.lexicalService.spinnerAction('off');
                    this.lexicalService.updateLexCard(data)
                    data['request'] = 0;
                    this.lexicalService.refreshAfterEdit(data);
                }, error => {
                    //console.log(error)
                    const data = this.object;
                    data['request'] = 0;
                    this.toastr.error(error.error, 'Error', {
                        timeOut: 5000,
                    });
                    //this.lexicalService.refreshAfterEdit(data);
                    this.lexicalService.updateLexCard({ lastUpdate: error.error.text })
                    this.lexicalService.spinnerAction('off');
                    if(typeof(error.error) != 'object'){
                        this.toastr.error(error.error, 'Error', {
                          timeOut: 5000,
                        });
                    }else{
                        this.toastr.success('Label changed correctly for ' + lexId, '', {
                            timeOut: 5000,
                        });
                    }
                }
            )
            this.memoryDenotes[index] = data;
        }


    }

    onChangeCognates(data) {
        var index = data['i'];
        this.cognatesArray = this.coreForm.get("cognate") as FormArray;
        if (this.memoryCognates[index] == undefined) {
            const newValue = data['name']
            const parameters = {
                type: "lexicalRel",
                relation: "cognate",
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
                        this.toastr.success('Cognates changed correctly for ' + lexId, '', {
                            timeOut: 5000,
                        });
                    }else{
                        this.toastr.error(error.error, 'Error', {
                            timeOut: 5000,
                          });
                        
                    }
                }
            )
            this.memoryCognates[index] = data;


        } else {
            const oldValue = this.memoryCognates[index]['lexicalEntity']
            const newValue = data['name']
            const parameters = {
                type: "lexicalRel",
                relation: "cognate",
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
            this.memoryCognates[index] = data;
        }


    }

   /*  handleEvokes(evt, i) {

        if (evt instanceof NgSelectComponent) {
            if (evt.selectedItems.length > 0) {
                let label = evt.selectedItems[0].label
                this.onChangeDenotes({ name: label, i: i })
            }
        } else {
            let label = evt.target.value;
            this.evokes_subject.next({ name: label, i: i })
        }

    }
 */
    

    addDenotes(e?, t?) {
        this.denotesArray = this.coreForm.get("denotes") as FormArray;
        if (e != undefined) {
            this.denotesArray.push(this.createDenotes(e, t));
        } else {
            this.denotesArray.push(this.createDenotes());
        }

    }

    addCognates(e?, t?) {
        setTimeout(() => {
            //@ts-ignore
            $('.cognates-tooltip').tooltip({
                trigger: 'hover'
            });
        }, 1000);
        this.cognatesArray = this.coreForm.get("cognate") as FormArray;
        if (e != undefined) {
            this.cognatesArray.push(this.createCognates(e, t));
        } else {
            this.cognatesArray.push(this.createCognates());
        }

    }

    

    addMorphoTraits(t?, v?, d?) {
        this.morphoTraits = this.coreForm.get('morphoTraits') as FormArray;
        if (t != undefined) {
            this.morphoTraits.push(this.createMorphoTraits(t, v, d));
        } else {
            this.morphoTraits.push(this.createMorphoTraits());
        }
    }

    removeElement(index) {
        this.memoryTraits.splice(index, 1);
        this.valueTraits.splice(index, 1);
        this.staticMorpho.splice(index, 1)
        
        this.morphoTraits = this.coreForm.get('morphoTraits') as FormArray;

        const trait = this.morphoTraits.at(index).get('trait').value;
        const value = this.morphoTraits.at(index).get('value').value;

        

        if (trait != '') {

            let lexId = this.object.lexicalEntryInstanceName;

            let parameters = {
                type: 'morphology',
                relation: trait,
                value: value
            }

            //console.log(parameters)

            this.lexicalService.deleteLinguisticRelation(lexId, parameters).subscribe(
                data => {
                    //console.log(data)
                    this.lexicalService.updateLexCard(this.object)
                    this.lexicalService.refreshAfterEdit({ request: 0, label: this.object.label });
                    this.lexicalService.spinnerAction('off');
                    this.lexicalService.refreshFilter({ request: true })
                }, error => {
                    //console.log(error)
                    this.lexicalService.refreshAfterEdit({ request: 0, label: this.object.label });
                    this.lexicalService.spinnerAction('off');
                    this.lexicalService.refreshFilter({ request: true })
                    this.lexicalService.updateLexCard({ lastUpdate: error.error.text })
                    if(typeof(error.error) != 'object'){
                        this.toastr.error(error.error, 'Error', {
                          timeOut: 5000,
                        });
                    }else{
                        this.toastr.success('Element removed correctly for ' + lexId, '', {
                            timeOut: 5000,
                        });
                    }
                }
            )
        }


        this.morphoTraits.removeAt(index);
    }

    removeDenotes(index) {
        this.denotesArray = this.coreForm.get('denotes') as FormArray;

        const entity = this.denotesArray.at(index).get('entity').value;

        let lexId = this.object.lexicalEntryInstanceName;

        let parameters = {
            relation: 'denotes',
            value: entity
        }
        

        if (entity != '') {
            this.lexicalService.deleteLinguisticRelation(lexId, parameters).subscribe(
                data => {
                    console.log(data)
                    this.lexicalService.updateLexCard(this.object);
                    
                }, error => {
                    console.log(error)
                    //this.lexicalService.updateLexCard({ lastUpdate: error.error.text })
                    this.toastr.error(error.error, 'Error', {
                        timeOut: 5000,
                    });
                }
            )
        }


        this.denotesArray.removeAt(index);

        this.memoryDenotes.splice(index, 1)
    }

    removeCognates(index) {
        this.cognatesArray = this.coreForm.get('cognate') as FormArray;

        const entity = this.cognatesArray.at(index).get('entity').value;

        let lexId = this.object.lexicalEntryInstanceName;

        let parameters = {
            relation: 'cognate',
            value: entity
        }
        

        if (entity != '') {
            this.lexicalService.deleteLinguisticRelation(lexId, parameters).subscribe(
                data => {
                    console.log(data)
                    this.lexicalService.updateLexCard(this.object);
                    this.toastr.success("Cognate deleted successfully", '', {
                        timeOut: 5000,
                    });
                    
                }, error => {
                    console.log(error)
                    //this.lexicalService.updateLexCard({ lastUpdate: error.error.text })
                    this.toastr.error(error.error, 'Error', {
                        timeOut: 5000,
                    });
                }
            )
        }


        this.cognatesArray.removeAt(index);

        this.memoryCognates.splice(index, 1)
    }

    isEtymon(boolean: boolean){
        
        setTimeout(() => {
            //@ts-ignore
        $('.type-tooltip').tooltip({
            trigger: 'hover'
        });
        }, 700);

        this.lexicalService.spinnerAction('on');
        let lexId = this.object.lexicalEntryInstanceName;
        let value = '';
        if(boolean){
            value = 'Etymon'
            this.coreForm.get('type').setValue('Etymon', { emitEvent: false });
            this.coreForm.get('type').disable({onlySelf: true, emitEvent: false})
        }else{
            value = 'LexicalEntry'
            this.coreForm.get('type').setValue('LexicalEntry', { emitEvent: false });
            this.coreForm.get('type').enable({onlySelf: true, emitEvent: false})
        }

        let parameters = {
            relation: 'type',
            value: value
        }

        this.lexicalService.updateLexicalEntry(lexId, parameters).subscribe(
            data => {
                //console.log(data);
                this.lexicalService.spinnerAction('off');
                this.lexicalService.updateLexCard(data)
                this.lexicalService.refreshFilter({ request: true })

               
            },
            error => {
                //console.log(error);
                const data = this.object;
                this.lexicalService.spinnerAction('off');
                this.lexicalService.refreshFilter({ request: true })
                this.lexicalService.updateLexCard({ lastUpdate: error.error.text })
            }
        )
    } 
}
