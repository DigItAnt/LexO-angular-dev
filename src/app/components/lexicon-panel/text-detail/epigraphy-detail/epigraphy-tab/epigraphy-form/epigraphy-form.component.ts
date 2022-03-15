import { AfterViewInit, ApplicationRef, Component, ComponentFactoryResolver, ComponentRef, ContentChild, ElementRef, HostListener, Injector, Input, OnInit, QueryList, Renderer2, SimpleChanges, TemplateRef, ViewChild, ViewChildren } from '@angular/core';
import { FormGroup, FormControl, Validators, FormArray, FormBuilder } from '@angular/forms';
import { NgbPopover, NgbPopoverConfig } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectComponent } from '@ng-select/ng-select';
import { ToastrService } from 'ngx-toastr';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { AnnotatorService } from 'src/app/services/annotator/annotator.service';
import { DocumentSystemService } from 'src/app/services/document-system/document-system.service';
import { ExpanderService } from 'src/app/services/expander/expander.service';
import { LexicalEntriesService } from 'src/app/services/lexical-entries/lexical-entries.service';
import { SearchFormComponent } from './search-form/search-form.component';
declare var $: JQueryStatic;



@Component({
  selector: 'app-epigraphy-form',
  templateUrl: './epigraphy-form.component.html',
  styleUrls: ['./epigraphy-form.component.scss']
})
export class EpigraphyFormComponent implements OnInit {

  @Input() epiData: any;
  object: any;
  tokenArray: FormArray;


  private bind_subject: Subject<any> = new Subject();
  searchResults = [];
  memoryForms = [];

  selectedPopover = {
    htmlNodeName: '',
    tokenId: ''
  };

  spanSelection = {
    start : 0,
    end : 0
  }

  data: object;
  sel_t: object;
  message: string;
  isOpen = false;
  bind = this;
  @ViewChildren('span_modal') spanPopovers: QueryList<any>;
  @ViewChild('search_form') searchForm : SearchFormComponent;

  //@ViewChild('span_modal') spanPopover: ElementRef;
  epigraphyForm = new FormGroup({
    tokens: new FormArray([this.createToken()]),
  })


  multiWordMode = false;
  annotationArray = [];
  token_annotationArray = [];

  @HostListener('document:mousedown', ['$event'])
  onGlobalClick(event): void {

    setTimeout(() => {

      //PREVENIRE CHE I POPOVER SI CHIUDANO SE CLICCATI FUORI DAL COMPONENTE
      let index = this.selectedPopover.tokenId

      //SE IL CLICK AVVIENE FUORI QUESTO COMPONENTE, L'EVENTUALE POPOVER DEVE RESTARE APERTO, 
      //SE SI CLICCA QUESTO COMPONENTE IL POPOVER VA CHIUSO E RIATTIVATO L'AUTOCLOSE
      if (index != '') {
        //console.log(this.config)
        let popover = this.spanPopovers.toArray()[index];
        if (popover.isOpen()) {
          //console.log(popover.isOpen())
          //console.log(popover)
          /* popover.autoClose = false; */
        }
      }



    }, 17);

    setTimeout(() => {
      /* console.log(event.path) */
      let evtPath = Array.from(event.path)
      let htmlNode = document.getElementById(this.selectedPopover.htmlNodeName)
      let tokenId = this.selectedPopover.tokenId;
      if (evtPath.includes(htmlNode)) {

      } else {
        if(this.object != null){
          this.object.forEach(element => {
            if (element.id != tokenId) {
  
              element.editing = false;
  
              this.selectedPopover.htmlNodeName = '';
              this.selectedPopover.tokenId = ''
            }
          });
        }
        

        let parentMarkElement = document.getElementsByClassName('token-' + tokenId)[0];
        //console.log(document.getElementsByClassName('token-'+tokenId))
        if (parentMarkElement != null) {
          let i = 0;
          Array.from(parentMarkElement.childNodes).forEach(
            element => {
              console.log(element)
              let textMarkElement = element.textContent;
              let prev, next;
              if (element['classList'] != undefined) {

                if (element['classList'].contains('mark') || element['classList'].contains('mark_test')) {

                  prev = Array.from(parentMarkElement.childNodes)[i - 1];
                  next = Array.from(parentMarkElement.childNodes)[i];

                  if (next == element) {
                    next = Array.from(parentMarkElement.childNodes)[i + 1];
                  }

                  if (prev != undefined) {
                    if (prev.nodeName == '#text') {
                      textMarkElement = prev.textContent += textMarkElement;
                      prev.remove();
                    }
                  }

                  if (next != undefined) {
                    if (next.nodeName == '#text') {
                      textMarkElement += next.textContent;
                      next.remove()
                    }
                  }

                  const text = this.renderer.createText(textMarkElement)

                  this.renderer.insertBefore(parentMarkElement, text, element)
                  //this.renderer.removeChild(parentMarkElement, element);

                  element.remove();


                }
              }

              i++;
            }
          );

        }

      }
    }, 17);



    let evtPath = Array.from(event.path);
    let isMultiwordRequest = false;
    evtPath.some((element: HTMLElement) => {
      if (element.classList != undefined) {
        if (element.classList.contains('multiword-button')) {
          isMultiwordRequest = true;
          return true;
        } else {
          isMultiwordRequest
          return false;
        }
      } else {
        return false;
      }
    })

    let event_el;


    if (isMultiwordRequest) {
      let multiWordArray = Array.from(document.getElementsByClassName('multiword'));
      multiWordArray.forEach(element => {
        let children = Array.from(element.children);
        children.forEach(subchild => {
          if (subchild.classList.contains('multiword-button')) {
            subchild.remove();
          }
        })
      });
      document.querySelectorAll('.multiword').forEach(element => {
        this.renderer.removeClass(element, 'multiword');
        this.renderer.addClass(element, 'multiword-span-' + 1);
        
        let prev = element.previousElementSibling;
        let next = element.nextElementSibling;

        if (prev != undefined) {
          if (prev.classList != undefined) {
            let classNames = prev.className;
            let matchTest = /(^|\s)(multiword-span-\d)(\s|$)/.test(classNames)
            if (matchTest) {
              this.renderer.addClass(element, 'border-left-0')
            }
          }
        } else if (next != undefined) {
          if (next.classList != undefined) {
            let classNames = next.className;
            let matchTest = /(^|\s)(multiword-span-\d)(\s|$)/.test(classNames)
            if (matchTest) {
              this.renderer.addClass(element, 'border-right-0')
            }
          }
        }
      })
      

    } else {
      if (!this.multiWordMode) {

        //console.log(document.querySelectorAll('.token'))
        document.querySelectorAll('.multiword').forEach(element => {
          this.renderer.removeClass(element, 'multiword')
          this.renderer.removeClass(element, 'border-right-0');
        });
      }
    }









  }



  @HostListener('window:keydown', ['$event'])
  enableMultiword(event: KeyboardEvent) {
    /* console.log(event) */
    if (event.altKey && event.ctrlKey) {
      this.multiWordMode = true;
      this.object.forEach(element => {
        element.editing = false;
        this.selectedPopover.htmlNodeName = '';
        this.selectedPopover.tokenId = ''
      });
    } else if (event.code == 'Escape') {

      let htmlNode = document.getElementById(this.selectedPopover.htmlNodeName)
      let tokenId = this.selectedPopover.tokenId;

      this.object.forEach(element => {
        if (element.id != tokenId) {

          element.editing = false;

          this.selectedPopover.htmlNodeName = '';
          this.selectedPopover.tokenId = ''
        }
      });

      let parentMarkElement = document.getElementsByClassName('token-' + tokenId)[0];
      if (parentMarkElement != null) {
        let i = 0;
        Array.from(parentMarkElement.children).forEach(
          element => {
            console.log(element)
            if (element.classList.contains('mark')) {

              let textMarkElement = element.textContent;
              const text = this.renderer.createText(textMarkElement)
              //parentMarkElement.textContent = parentMarkElement.textContent.trim();
              //let innerText = parentMarkElement.textContent;
              this.renderer.insertBefore(parentMarkElement, text, element)
              this.renderer.removeChild(parentMarkElement, element);
              //parentMarkElement.insertBefore(text, parentMarkElement.childNodes[i+1]);
              //let children = parentMarkElement.children;
              //parentMarkElement.textContent = innerText
              i++;
              return;
            }
            i++;
          }
        );

      }



    }
  }

  @HostListener('window:keyup', ['$event'])
  disableMultiword(event: KeyboardEvent) {
    if (!event.altKey && !event.ctrlKey) {
      this.multiWordMode = false;
    }
  }

  constructor(private resolver: ComponentFactoryResolver, private injector: Injector, private appRef: ApplicationRef, private annotatorService: AnnotatorService, private expander: ExpanderService, private renderer: Renderer2, private documentService: DocumentSystemService, private formBuilder: FormBuilder, private toastr: ToastrService, private lexicalService: LexicalEntriesService, private config: NgbPopoverConfig) { }


  ngOnInit(): void {

    /* this.config.autoClose = false */


    this.epigraphyForm = this.formBuilder.group({
      tokens: this.formBuilder.array([this.createToken()])
    })



    this.bind_subject.pipe(debounceTime(100)).subscribe(
      data => {
        /* console.log(data) */
        this.bindSelection(data.popover, data.evt, data.i);
      }
    )

    this.annotatorService.deleteAnnoReq$.subscribe(
      data=> {
        if(data != null){
          this.annotationArray = this.annotationArray.filter(
            element => {
              return element.id != data
            }
          )
          console.log(this.annotationArray)
        }
      }
    )

  }


  ngOnChanges(changes: SimpleChanges) {
    setTimeout(() => {
      if(changes.epiData.currentValue != null){
        if (this.object != changes.epiData.currentValue) {
          this.tokenArray = this.epigraphyForm.get('tokens') as FormArray;
          this.tokenArray.clear();
          this.spanSelection.start = 0;
          this.spanSelection.end = 0;
          /* 
  
          this.denotesArray = this.coreForm.get('denotes') as FormArray;
          this.denotesArray.clear();
  
          this.cognatesArray = this.coreForm.get('cognate') as FormArray;
          this.cognatesArray.clear();
  
          this.evokesArray = this.coreForm.get('evokes') as FormArray;
          this.evokesArray.clear();
  
          this.memoryPos = '';
  
          this.staticMorpho = [] */
        }
        
        
        this.object = changes.epiData.currentValue['tokens'];
        let element_id = changes.epiData.currentValue['element_id']
        /* console.log(this.object) */
        if (this.object != null) {
  
          //TODO: popolare array form con tokens
          console.log(this.object)
          
          this.annotatorService.getAnnotation(element_id).subscribe(
            data=>{
              console.log(data);
              this.annotationArray = data;
              this.lexicalService.triggerAttestationPanel(true);
              this.lexicalService.sendToAttestationPanel(data);
            },error=>{
              console.log(error)
            }
          )
        }
      }else{
        this.object = null;
      }
      


    }, 10)

  }

  ngOnDestroy(){
    
  }



  createToken(token?) {
    if (token != undefined) {
      return this.formBuilder.group({
        entity: new FormControl(token)
      })
    } else {
      return this.formBuilder.group({
        entity: new FormControl('')
      })
    }
  }

  enterCell(evt, i) {
    //console.log("enter cell " + i);
    /* console.log(evt); */
    let parentNode = evt.target.parentElement
    if (parentNode != undefined) {
      let classNames = parentNode.className;
      let matchTest = /(^|\s)(multiword-span-\d)(\s|$)/.test(classNames)
      if (matchTest) {
        //TODO: highlight su div che contiene multiword
      } else {
        this.object[i]['selected'] = true;
        
        if (window.getSelection) {
          if (window.getSelection().empty) {  // Chrome
            window.getSelection().empty();
          } else if (window.getSelection().removeAllRanges) {  // Firefox
            window.getSelection().removeAllRanges();
          }
        }
      }
    }



  }

  leavingCell(evt, i) {
    //console.log("leaving cell " + i);
    this.object[i]['selected'] = false;

  }

  deleteSelection(popover, evt, i) {
    setTimeout(() => {

    }, 10);
    let popoverHtml = popover._elementRef.nativeElement;
    console.log(popoverHtml.querySelectorAll('.annotation'))
    if (popoverHtml.querySelectorAll('.annotation').length > 0) {

    } else {
      popoverHtml.textContent = popoverHtml.textContent.trim();
    }
    /* if(popoverHtml.querySelectorAll('.mark').length > 0){
      let innerText = popoverHtml.innerText;
      const childElements = popoverHtml.children;
      for (let child of childElements) {
        console.log(child)
        this.renderer.removeChild(popoverHtml, child);
      }
      console.log(innerText)
      popoverHtml.innerText = innerText
    }else if(popoverHtml.querySelectorAll('.mark').length == 0){
      
    } */

  }

  triggerBind(popover, evt, i) {
    if (!this.multiWordMode) {
      this.bind_subject.next({ popover, evt, i })
    } else {
      //console.log("multiword mode", i)
      console.log(popover);
      this.multiWordCreator(popover, evt, i);
    }
  }


  multiWordCreator(popover, evt, i) {
    let span = popover._elementRef.nativeElement.parentNode.parentNode.childNodes[i];
    let prevSibling, nextSibling;
    prevSibling = popover._elementRef.nativeElement.parentNode.previousSibling;
    nextSibling = popover._elementRef.nativeElement.parentNode.nextSibling;



    if (span.classList.contains('multiword')) {
      this.renderer.removeClass(span, 'multiword')
      if (prevSibling != null) {
        if (prevSibling.classList.contains('multiword')) {
          this.renderer.removeClass(prevSibling, 'border-right-0')
        }
      }
      if (nextSibling != null) {
        if (nextSibling.classList != undefined) {
          if (nextSibling.classList.contains('multiword')) {
            this.renderer.removeClass(span, 'border-right-0')
          }
        }

      }
      let multiWordArray = Array.from(document.getElementsByClassName('multiword'));
      multiWordArray.forEach(element => {
        let children = Array.from(element.children);
        children.forEach(subchild => {
          if (subchild.classList.contains('multiword-button')) {
            subchild.remove();
          }
        })
      });

      if (multiWordArray.length > 1) {
        console.log(multiWordArray[multiWordArray.length - 1])
        this.createDynamicButtons(multiWordArray[multiWordArray.length - 1]);
      }


    } else {
      this.renderer.addClass(span, 'multiword');
      if (prevSibling != null) {
        if (prevSibling.classList.contains('multiword')) {
          this.renderer.addClass(prevSibling, 'border-right-0');
        }
      }
      if (nextSibling != null) {
        if (nextSibling.classList != undefined) {
          if (nextSibling.classList.contains('multiword')) {
            this.renderer.addClass(span, 'border-right-0')
          }
        }
      }
      let multiWordArray = Array.from(document.getElementsByClassName('multiword'));
      multiWordArray.forEach(element => {
        let children = Array.from(element.children);
        children.forEach(subchild => {
          if (subchild.classList.contains('multiword-button')) {
            subchild.remove();
          }
        })
      });

      if (multiWordArray.length > 1) {
        this.createDynamicButtons(span);
      } else if (multiWordArray.length == 1) {
        multiWordArray.forEach(element => {
          let children = Array.from(element.children);
          children.forEach(subchild => {
            if (subchild.classList.contains('multiword-button')) {
              subchild.remove();
            }
          })
        });
      }
    }

  }

  createDynamicButtons(span) {
    let div = this.renderer.createElement('div');
    this.renderer.addClass(div, 'multiword-button');
    let okButton = this.renderer.createElement('button');
    let leaveButton = this.renderer.createElement('button');

    let okIcon = this.renderer.createElement('i');
    this.renderer.addClass(okIcon, 'fas');
    this.renderer.addClass(okIcon, 'fa-check');

    let leaveIcon = this.renderer.createElement('i');
    this.renderer.addClass(leaveIcon, 'fas');
    this.renderer.addClass(leaveIcon, 'fa-times');

    this.renderer.appendChild(okButton, okIcon);
    this.renderer.appendChild(leaveButton, leaveIcon);
    this.renderer.setStyle(okButton, 'position', 'absolute');
    this.renderer.setStyle(okButton, 'top', '-1.5rem');
    this.renderer.setStyle(okIcon, 'font-size', '10px');
    this.renderer.setStyle(okIcon, 'width', '10px');

    this.renderer.setStyle(leaveButton, 'position', 'absolute');
    this.renderer.setStyle(leaveButton, 'top', '-1.5rem');
    this.renderer.setStyle(leaveIcon, 'font-size', '10px');
    this.renderer.setStyle(leaveIcon, 'width', '10px');
    this.renderer.setStyle(leaveButton, 'left', '1.5rem');

    this.renderer.appendChild(div, okButton)
    this.renderer.appendChild(div, leaveButton)
    this.renderer.appendChild(span, div);
  }

  populateLocalAnnotation(anno){
    this.token_annotationArray = [];
    this.annotationArray.forEach(
      annotation => {

        let start_token = anno.spans[0].start;
        let end_token = anno.spans[0].end;

        annotation.spans.forEach(element => {
          if(element.start >= start_token && element.end <= end_token){
            this.token_annotationArray.push(annotation);
          }
        });
      }
    )
    if(this.token_annotationArray.length > 0){
      this.lexicalService.triggerAttestationPanel(true);
      this.lexicalService.sendToAttestationPanel(this.token_annotationArray)
    }
  }

  bindSelection(popover, evt, i) {

    console.log(this.object[i])
    this.token_annotationArray = [];
    this.annotationArray.forEach(
      annotation => {

        let start_token = this.object[i].begin;
        let end_token = this.object[i].end;

        annotation.spans.forEach(element => {
          if(element.start >= start_token && element.end <= end_token){
            this.token_annotationArray.push(annotation);
          }
        });

        if(this.token_annotationArray.length > 0){
          this.lexicalService.triggerAttestationPanel(true)
          this.lexicalService.sendToAttestationPanel(this.token_annotationArray);
        }else{
          this.lexicalService.triggerAttestationPanel(false)
          this.lexicalService.sendToAttestationPanel(null);
        }
      }
    )

    //console.log(evt)
    setTimeout(() => {
      
      this.message = '';
      this.object[i]['editing'] = true;
      this.message = window.getSelection().toString();
      if (this.selectedPopover.htmlNodeName == '') {
        this.selectedPopover.htmlNodeName = popover._ngbPopoverWindowId;
        this.selectedPopover.tokenId = i;
      }
      else if (popover._ngbPopoverWindowId != this.selectedPopover) {
        this.selectedPopover.htmlNodeName = popover._ngbPopoverWindowId
        this.selectedPopover.tokenId = i
        this.object.forEach(element => {
          if (element.id != i + 1) {
            //console.log(element)
            element.editing = false;
          } else {
            //console.log(element)
            element.editing = true;
          }
        });
      }

      if (popover.isOpen()) {

      } else if (!popover.isOpen()) {
        popover.open()
      }

      let popoverHtml = popover._elementRef.nativeElement;
      let innerText = popoverHtml.innerText;
      let selection = document.getSelection();
      let anchorNode = selection.anchorNode;
      let focusNode = selection.focusNode;
      let isThereMark, areThereAnnotations;
      //isThereMark = popoverHtml.querySelectorAll('.mark').length > 0;
      //areThereAnnotations = popoverHtml.querySelectorAll('.annotation').length > 0;

      if (anchorNode != null && focusNode != null) {
        let anchorNodeParent = selection.anchorNode.parentNode;
        let focusNodeParent = selection.focusNode.parentNode;

        if (anchorNodeParent == focusNodeParent && this.message != '' ) { /* && !areThereAnnotations */
          //SE SELEZIONO UNA PARTE DEL TOKEN
        
          if (selection.anchorNode.textContent.trim().length == innerText.length && this.message != innerText) { //!isThereMark && 
            
            let anchorOffset = selection.anchorOffset;
            let focusOffset = selection.focusOffset;


            if (anchorOffset > focusOffset) {
              let tmp = anchorOffset;
              anchorOffset = focusOffset;
              focusOffset = tmp;
            }

            //console.log(innerText.substring(anchorOffset, focusOffset))
            console.log(anchorOffset)
            console.log(focusOffset);

            popoverHtml.innerText = "";

            const span = this.renderer.createElement('span');
            const l_text = this.renderer.createText(innerText.substring(0, anchorOffset))
            const text = this.renderer.createText(this.message);
            const r_text = this.renderer.createText(innerText.substring(focusOffset, innerText.length))


            /* console.log("l_text:", l_text)
            console.log("text:", text)
            console.log("r_text:", r_text) */


            this.renderer.appendChild(span, text)
            this.renderer.appendChild(popoverHtml, span);
            this.renderer.addClass(span, 'mark'),
            this.renderer.setAttribute(span, 'startoffset', anchorOffset.toString());
            this.renderer.setAttribute(span, 'endoffset', focusOffset.toString())

            if (l_text.textContent != "") {
              this.renderer.insertBefore(popoverHtml, l_text, span);
            }

            if (r_text.textContent != "") {
              this.renderer.appendChild(popoverHtml, r_text);
            }
            //console.log(popoverHtml.childNodes)
            this.spanSelection.start = this.object[i].begin + anchorOffset;
            this.spanSelection.end = this.object[i].begin + focusOffset -1;
            this.annotatorService.triggerSearch(this.message);
          }else if(selection.anchorNode.textContent.trim().length == innerText.length && this.message == innerText){
            this.message = '';
            this.annotatorService.triggerSearch(innerText);
          }
        } 
        //SE SELEZIONO L'INTERO TOKEN
        
        else if(this.message == ''){
          this.annotatorService.triggerSearch(innerText);
          this.spanSelection.start = 0;
          this.spanSelection.end = 0;
        }
        /* else if (this.message != '' ) { //&& areThereAnnotations
          let anchorOffset = selection.anchorOffset;
          let focusOffset = selection.focusOffset;
          let range = selection.getRangeAt(0)

          var sel = getSelection(),
            position = sel.anchorNode.compareDocumentPosition(sel.focusNode),
            backward = false;
          // position == 0 if nodes are the same
          if (!position && sel.anchorOffset > sel.focusOffset || position === Node.DOCUMENT_POSITION_PRECEDING) {
            backward = true;
          }

          console.log(backward)

          let startContainer = range.startContainer;
          let endContainer = range.endContainer;
          let textStartContainer = range.startContainer.textContent;
          let textEndContainer = range.endContainer.textContent;
          let annotations = popoverHtml.querySelectorAll('.annotation')

          //console.log(range.startContainer == range.endContainer)
          if (range.startContainer == range.endContainer) {
            if (anchorOffset > focusOffset) {
              let tmp = anchorOffset;
              anchorOffset = focusOffset;
              focusOffset = tmp;
            }
            this.message = textStartContainer.substring(range.startOffset, range.endOffset);
            const span = this.renderer.createElement('span');

            const l_text = this.renderer.createText(textStartContainer.substring(0, range.startOffset))
            const text = this.renderer.createText(this.message);
            const r_text = this.renderer.createText(textStartContainer.substring(range.endOffset, textStartContainer.length))

            //console.log(anchorOffset, focusOffset)
            //console.log("l_text:" , l_text)
            //console.log("text:" , text)
            //console.log("r_text:" , r_text)

            //range.startContainer.textContent = '';


            this.renderer.appendChild(span, text)
            this.renderer.addClass(span, 'mark');

            console.log(popoverHtml.childNodes)
            let i = 0;
            const getStartEnd = (str, sub) => [str.indexOf(sub), str.indexOf(sub) + sub.length - 1];
            let generalStartEndOffset = getStartEnd(popoverHtml.textContent, this.message);
            let children = Array.from(popoverHtml.childNodes).forEach(
              x => {
                if (range.startContainer == x) {
                  range.startContainer.textContent = '';

                  if (l_text.textContent != "") {
                    this.renderer.insertBefore(popoverHtml, l_text, x)
                  }



                  this.renderer.setAttribute(span, 'startoffset', anchorOffset.toString());
                  this.renderer.setAttribute(span, 'endoffset', focusOffset.toString())

                  popoverHtml.insertBefore(span, popoverHtml.childNodes[i + 1]);

                  if (r_text.textContent != "") {
                    popoverHtml.insertBefore(r_text, popoverHtml.childNodes[i + 2]);
                  }
                  //@ts-ignore
                  x.remove()
                }

                i++;
              }
            )
          } else if (range.startContainer != range.endContainer) {
            console.log(range)
            console.log(startContainer);
            console.log(endContainer)

            if (backward) {
              let tmp = anchorOffset;
              anchorOffset = focusOffset;
              focusOffset = tmp;
            }

            console.log(anchorOffset, focusOffset)

            this.message = '';
            let walker = function foo(element, that) {

              let textElement = element.textContent
              let nextSibling = element.nextSibling;
              if (element == endContainer) {
                console.log("end container", endContainer)
                that.message += textElement.substring(0, focusOffset)

                const span = that.renderer.createElement('span');
                const text = that.renderer.createText(textElement.substring(0, focusOffset));
                const r_text = that.renderer.createText(textElement.substring(focusOffset, textElement.length))


                that.renderer.appendChild(span, text)
                that.renderer.addClass(span, 'mark_test');

                let i = 0;
                const getStartEnd = (str, sub) => [str.indexOf(sub), str.indexOf(sub) + sub.length - 1];
                let generalStartEndOffset = getStartEnd(popoverHtml.textContent, that.message);
                let children = Array.from(popoverHtml.childNodes).forEach(
                  x => {
                    console.log(i, x)
                    if (element == x) {
                      element.textContent = '';

                      //that.renderer.setAttribute(span, 'startoffset', generalStartEndOffset[0]);
                      //that.renderer.setAttribute(span, 'endoffset', generalStartEndOffset[1])

                      popoverHtml.insertBefore(span, popoverHtml.childNodes[i + 1]);

                      if (r_text.textContent != "") {
                        popoverHtml.insertBefore(r_text, popoverHtml.childNodes[i + 2]);
                      }

                      //@ts-ignore
                      x.remove();

                    }

                    i++;
                  }
                )
                return;
              } else {
                console.log("current element", element);


                if (element == startContainer) {
                  that.message = textElement.substring(anchorOffset, textElement.length);
                  const span = that.renderer.createElement('span');
                  const l_text = that.renderer.createText(textStartContainer.substring(0, anchorOffset))
                  const text = that.renderer.createText(that.message);

                  that.renderer.appendChild(span, text)
                  that.renderer.addClass(span, 'mark_test');

                  let i = 0;
                  const getStartEnd = (str, sub) => [str.indexOf(sub), str.indexOf(sub) + sub.length - 1];
                  let generalStartEndOffset = getStartEnd(popoverHtml.textContent, that.message);
                  let children = Array.from(popoverHtml.childNodes).forEach(
                    x => {
                      if (element == x) {
                        element.textContent = '';

                        if (l_text.textContent != "") {
                          that.renderer.insertBefore(popoverHtml, l_text, x)
                        }

                        //that.renderer.setAttribute(span, 'startoffset', generalStartEndOffset[0]);
                        popoverHtml.insertBefore(span, popoverHtml.childNodes[i + 1]);
                        //@ts-ignore
                        x.remove();
                      }

                      i++;
                    }
                  )
                }

                if (element.classList == undefined && element != startContainer) {
                  that.message += element.textContent;
                  const span = that.renderer.createElement('span');
                  const text = that.renderer.createText(element.textContent);

                  that.renderer.appendChild(span, text)
                  that.renderer.addClass(span, 'mark_test');

                  let i = 0;
                  const getStartEnd = (str, sub) => [str.indexOf(sub), str.indexOf(sub) + sub.length - 1];
                  let generalStartEndOffset = getStartEnd(popoverHtml.textContent, that.message);
                  let children = Array.from(popoverHtml.childNodes).forEach(
                    x => {
                      if (element == x) {
                        element.textContent = '';
                        //that.renderer.setAttribute(span, 'startoffset', generalStartEndOffset[0]);
                        //that.renderer.setAttribute(span, 'endoffset', generalStartEndOffset[1])
                        popoverHtml.insertBefore(span, popoverHtml.childNodes[i + 1]);
                        //@ts-ignore
                        x.remove();
                      }

                      i++;
                    }
                  )

                }

                 //if(element.classList != undefined){
                   //if(element.classList.contains('annotation')){
                     
                   //}
                // }

                if (nextSibling != null) {
                  foo(nextSibling, that)
                }
              }
            }

            walker(startContainer, this)
          }


        } */
      }

      


      //TODO: inserire gestione di selezione per le multiword
      let parentNode = evt.target.parentElement;
      let classNames = parentNode.className;

      if(/(^|\s)(multiword-span-\d)(\s|$)/.test(classNames)){
        let multiwordSpan = Array.from(document.querySelectorAll("[class*=multiword-span-]"));
        let text = ''; 
        multiwordSpan.forEach(element => {
          console.log(element)
          text += element.textContent + ' ';
        })
        this.annotatorService.triggerSearch(text);
      }
    }, 10);

  }

  deleteAnnotation(annotation, index, token){
    let anno_id = annotation.id;
    let token_position = token.position;
    this.annotatorService.deleteAnnotation(anno_id).subscribe(
      data=> {
        console.log(data);
        let popover = document.getElementsByClassName('token-'+(token_position -1))[0]      
        this.renderer.removeClass(popover, "annotation_entire");
        this.renderer.removeClass(popover, "unselectable");

        this.lexicalService.triggerAttestationPanel(false)
      },
      error => {
        console.log(error)
      }
    )
    this.token_annotationArray.splice(index, 1)
    this.annotationArray.splice(index, 1);
  }

  getForm(formId){
    
    this.lexicalService.getFormData(formId, 'core').subscribe(
      data=>{
        console.log(data);
        this.lexicalService.sendToCoreTab(data)
        this.lexicalService.sendToEtymologyTab(null);
        this.lexicalService.sendToRightTab(data);
        this.lexicalService.updateLexCard({lastUpdate : data['lastUpdate'], creationDate : data['creationDate']});
        
        if(this.expander.isEpigraphyTabOpen() && !this.expander.isEditTabOpen()){
          if(this.expander.isEpigraphyTabExpanded() && !this.expander.isEditTabExpanded()){
            this.expander.openCollapseEdit(true);
            this.expander.expandCollapseEpigraphy(false)
          }
        }
        
        var text_detail = document.querySelectorAll('#text-dettaglio');
        text_detail.forEach(element => {
          if(!element.classList.contains('show')){
            element.classList.add('show')
          }
        })
      },
      error=>{
        console.log(error)
      }
    )
  }

}

