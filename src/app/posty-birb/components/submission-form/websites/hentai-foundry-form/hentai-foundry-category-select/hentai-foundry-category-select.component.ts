import { Component, OnInit, OnDestroy, forwardRef, ViewChild, ElementRef, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { NG_VALUE_ACCESSOR, FormControl } from '@angular/forms';
import { debounceTime, map } from 'rxjs/operators';
import { BaseControlValueAccessorComponent } from '../../../../../../commons/components/base-control-value-accessor/base-control-value-accessor.component';
import { Categories } from './hentai-foundry.categories';

@Component({
  selector: 'hentai-foundry-category-select',
  templateUrl: './hentai-foundry-category-select.component.html',
  styleUrls: ['./hentai-foundry-category-select.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => HentaiFoundryCategorySelectComponent),
      multi: true,
    }
  ]
})
export class HentaiFoundryCategorySelectComponent extends BaseControlValueAccessorComponent implements OnInit, OnDestroy {
  public control: FormControl = new FormControl();
  public filteredOptions: string[];
  private categories: any = Categories;
  private options: string[] = [];
  private optMap: Map<string, string> = new Map();
  private clearInterval: any;

  @ViewChild('auto') auto: any;
  @ViewChild('search') search: ElementRef;

  constructor(private _changeDetector: ChangeDetectorRef) {
    super();

    const keys = Object.keys(this.categories);
    for (let i = 0; i < keys.length; i++) {
      const o = keys[i];
      this.optMap.set(this.categories[o], o);
      this.options.push(this.categories[o]);
    }

    this.options.sort();
  }

  ngOnInit() {
    this.control.valueChanges
      .pipe(debounceTime(250), map(val => this.filter(val)))
      .subscribe(vals => {
        this.filteredOptions = vals;
        this._changeDetector.markForCheck();
      });
  }

  ngOnDestroy() {
    clearInterval(this.clearInterval);
  }

  filter(val: string): string[] {
    return this.options.filter(option =>
      option.toLowerCase().includes(val.toLowerCase()));
  }

  find(val: string): string {
    return this.optMap.get(val);
  }

  public writeValue(category: string) {
    if (category) {
      this.value = this.categories[category];
      this.control.patchValue(this.value, { emitEvent: false });
    } else {
      this.value = null;
      this.control.patchValue(null, { emitEvent: false });
    }

    this._changeDetector.detectChanges();
  }

  public onChange(value) {
    const v = this.find(value.option.value);
    if (v) {
      this.value = v;
    } else {
      this.value = undefined;
    }

    this.onChangedCallback(v);
    this.filteredOptions = [];
    this._changeDetector.markForCheck();
  }

  public onBlur(event: any) {
    clearInterval(this.clearInterval);
    this.clearInterval = setInterval(function() {
      if (!this.auto.isOpen) {
        clearInterval(this.clearInterval);

        this.filteredOptions = []
        this._changeDetector.markForCheck();

        this.onChange({ option: { value: this.search.nativeElement.value } })
      }
    }.bind(this), 500);
  }

  public onFocus(value: string): void {
    this.filteredOptions = this.filter(value || '');
    this._changeDetector.markForCheck();
  }

}
