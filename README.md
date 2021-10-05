# vim-6colors
The Vim color scheme editor that generates from only 6 colors or a single image.

## Demo
https://utubo.github.io/vim-6colors/

## Examples
- https://github.com/utubo/vim-colorscheme-yakiniku
- https://github.com/utubo/vim-colorscheme-rainycity

[more...](https://github.com/utubo/vim-6colors/wiki/Examples)

## Plugins support
- [ALE](https://github.com/dense-analysis/ale)
- [Easy Motion](https://github.com/easymotion/vim-easymotion)
- [Git Gutter](https://github.com/airblade/vim-gitgutter)
- [rainbow](https://github.com/luochen1990/rainbow)
- [rainbow-csv](https://github.com/mechatroner/rainbow_csv)

## Terminal
This supports terminal ansi colors.
If you don't want, let `g:terminal_ansi_colors`.
```vim
" Example
augroup terminal_ansi_color
au!
au ColorScheme * let g:terminal_ansi_colors = [
\ '#2d3037', " black
\ '#ab485f', " red
\ '#45ac90', " green
\ '#ab863b', " yellow
\ '#407baf', " blue
\ '#756187', " magenta
\ '#42939f', " cyan
\ '#ccdddd', " white
\ '#2d3037', " black (bright)
\ '#ff597a', " red (bright)
\ '#55ffcc', " green (bright)
\ '#ffc03e', " yellow (bright)
\ '#4daeff', " blue (bright)
\ '#a683bc', " magenta (bright)
\ '#51d6e5', " cyan (bright)
\ '#ffffff', " white (bright)
\ ]
augroup END
```

## 🙏
🍺
The code for the color scheme is based on  [vim_colorscheme_template](https://github.com/ggalindezb/vim_colorscheme_template).
🍺
