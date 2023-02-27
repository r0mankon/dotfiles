syntax enable
colorscheme koehler
set backspace=indent,eol,start
set expandtab
set tabstop=1
set shiftwidth=2
set autoindent
set smartindent
set backupcopy=yes
set statusline+=%{$USERNAME}@%{hostname()}
set laststatus=2
set number
set relativenumber
set ignorecase
set smartcase

let g:EasyMotion_smartcase = 1

" Use system clipboard
set clipboard=unnamedplus
 
" Enable searching as you type, rather than waiting till you press enter.
set incsearch
 
" Unbind some useless/annoying default key bindings.
nmap Q <Nop> 

nmap s <Plug>(easymotion-prefix)
 
" Disable audible bell because it's annoying.
set noerrorbells visualbell t_vb=
 
" it should be not has
if has('vscode')
  " Disable using the arrow keys for movement.
  nnoremap <Left>  :echoe "Use h"<CR>
  nnoremap <Right> :echoe "Use l"<CR>
  nnoremap <Up>    :echoe "Use k"<CR>
  nnoremap <Down>  :echoe "Use j"<CR>
  " ...and in insert mode
  inoremap <Left>  <ESC>:echoe "Use h"<CR>
  inoremap <Right> <ESC>:echoe "Use l"<CR>
  inoremap <Up>    <ESC>:echoe "Use k"<CR>
  inoremap <Down>  <ESC>:echoe "Use j"<CR>
endif

function! Cond(cond, ...)
  let opts = get(a:000, 0, {})
  return a:cond ? opts : extend(opts, { 'on': [], 'for': [] })
endfunction

if has('nvim')
" call plug#begin()

	" use normal easymotion when in VIM mode
" Plug 'easymotion/vim-easymotion', Cond(!exists('g:vscode'))

	" use VSCode easymotion when in VSCode mode
" Plug 'asvetliakov/vim-easymotion', Cond(exists('g:vscode'), { 'as': 'vsc-easymotion' })

" call plug#end()
endif

if has("gui_running")
  " Set a nicer font.
  set guifont=Source\ Code\ Pro:h14:cDEFAULT
  " Hide the toolbar.
  set guioptions-=T
  " Use diff theme for gui
  colorscheme torte
endif

