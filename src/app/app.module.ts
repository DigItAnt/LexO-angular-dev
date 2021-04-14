import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { TreeModule } from '@circlon/angular-tree-component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DataTablesModule } from 'angular-datatables';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { AngularEditorModule } from '@kolkov/angular-editor'
import { NgSelectModule } from '@ng-select/ng-select';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { LexiconPageComponent } from './views/lexicon-page/lexicon-page.component';
import { LoginPageComponent } from './views/login-page/login-page.component';
import { PageNotFoundComponent } from './views/page-not-found/page-not-found.component';
import { HomePageComponent } from './views/home-page/home-page.component';
import { ProfilePageComponent } from './views/profile-page/profile-page.component';
import { LexiconPanelComponent } from './components/lexicon-panel/lexicon-panel.component';
import { NotePanelComponent } from './components/note-panel/note-panel.component';
import { ReferencePanelComponent } from './components/reference-panel/reference-panel.component';
import { SearchPageComponent } from './views/search-page/search-page.component';
import { DataSearchFormComponent } from './components/data-search-form/data-search-form.component';
import { BibliographySearchFormComponent } from './components/bibliography-search-form/bibliography-search-form.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DocumentSystemTreeComponent } from './components/lexicon-panel/document-system-tree/document-system-tree.component';
import { TextTreeComponent } from './components/lexicon-panel/document-system-tree/text-tree/text-tree.component';
import { TextDetailComponent } from './components/lexicon-panel/text-detail/text-detail.component';
import { EpigraphyDetailComponent } from './components/lexicon-panel/text-detail/epigraphy-detail/epigraphy-detail.component';
import { EditDetailComponent } from './components/lexicon-panel/text-detail/edit-detail/edit-detail.component';
import { EpigraphyTabComponent } from './components/lexicon-panel/text-detail/epigraphy-detail/epigraphy-tab/epigraphy-tab.component';
import { DictionaryTabComponent } from './components/lexicon-panel/text-detail/edit-detail/dictionary-tab/dictionary-tab.component';
import { LexicalEntryTreeComponent } from './components/lexicon-panel/document-system-tree/lexical-entry-tree/lexical-entry-tree.component';
import { CoreTabComponent } from './components/lexicon-panel/text-detail/edit-detail/core-tab/core-tab.component';
import { VartransTabComponent } from './components/lexicon-panel/text-detail/edit-detail/vartrans-tab/vartrans-tab.component';
import { SynsemTabComponent } from './components/lexicon-panel/text-detail/edit-detail/synsem-tab/synsem-tab.component';
import { DecompositionTabComponent } from './components/lexicon-panel/text-detail/edit-detail/decomposition-tab/decomposition-tab.component';
import { ProfilesTableComponent } from './components/profiles-table/profiles-table.component';
import { LemmaInputComponent } from './components/lexicon-panel/text-detail/edit-detail/core-tab/lemma-input/lemma-input.component';
import { FormInputComponent } from './components/lexicon-panel/text-detail/edit-detail/core-tab/form-input/form-input.component';
import { SenseInputComponent } from './components/lexicon-panel/text-detail/edit-detail/core-tab/sense-input/sense-input.component';
import { HttpClientModule } from '@angular/common/http';
import { BibliographyPanelComponent } from './components/bibliography-panel/bibliography-panel.component';
import { AttestationPanelComponent } from './components/attestation-panel/attestation-panel.component';
import { FormTabComponent } from './components/attestation-panel/form-tab/form-tab.component';
import { SenseTabComponent } from './components/attestation-panel/sense-tab/sense-tab.component';
import { FrameTabComponent } from './components/attestation-panel/frame-tab/frame-tab.component';
import { CoreFormComponent } from './components/lexicon-panel/text-detail/edit-detail/core-tab/core-form/core-form.component';
import { ModalModule } from 'ng-modal-lib';

@NgModule({
  declarations: [
    AppComponent,
    NavbarComponent,
    LexiconPageComponent,
    LoginPageComponent,
    PageNotFoundComponent,
    HomePageComponent,
    ProfilePageComponent,
    LexiconPanelComponent,
    NotePanelComponent,
    ReferencePanelComponent,
    SearchPageComponent,
    DataSearchFormComponent,
    BibliographySearchFormComponent,
    DocumentSystemTreeComponent,
    TextTreeComponent,
    TextDetailComponent,
    EpigraphyDetailComponent,
    EditDetailComponent,
    EpigraphyTabComponent,
    DictionaryTabComponent,
    LexicalEntryTreeComponent,
    CoreTabComponent,
    VartransTabComponent,
    SynsemTabComponent,
    DecompositionTabComponent,
    ProfilesTableComponent,
    LemmaInputComponent,
    FormInputComponent,
    SenseInputComponent,
    BibliographyPanelComponent,
    AttestationPanelComponent,
    FormTabComponent,
    SenseTabComponent,
    FrameTabComponent,
    CoreFormComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    TreeModule,
    DataTablesModule,
    InfiniteScrollModule,
    HttpClientModule,
    AngularEditorModule,
    NgSelectModule,
    ModalModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }