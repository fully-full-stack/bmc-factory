require('./styles.css');
require('zepto');
window.jQuery = $;

Zepto.fn.outerWidth = function () {
    return $(this).width();
};

Zepto.fn.outerHeight = function () {
    return $(this).height();
};

require('dragsort');
require('./color-picker');


var LANGUAGE = {
    ptBR: require('./i18n/pt-BR'),
    enUS: require('./i18n/en-US')
};

var DICTIONARY = {};

/**
 * Traduz um termo existente no dicionário
 *
 * @param message
 * @param params
 * @returns {*}
 * @private
 */
function _(message, params) {
    var saida = DICTIONARY[message] || message;
    if (params) {
        var args = $.merge([saida], params);
        return sprintf(args);
    } else {
        return saida;
    }
}

/**
 * Faz a tradução de toda a página
 *
 * @param lang
 * @returns {null}
 */
function translate(lang) {
    DICTIONARY = LANGUAGE[lang];
    $('._t').each(function (i, item) {
        var $el = $(item);
        var label = $el.attr('id');
        var value = _(label);
        if ($el.is('textarea, input')) {
            $el[0].placeholder = value;
        } else {
            $el.html(value);
        }
    });
    return null;
}

var BMC = {};

/**
 * Versão deste BMC
 *
 * @type {number}
 */
BMC.VERSION = 1;


/**
 * Faz o carregamento de um JSON salvo de BMC
 *
 * @param {{designedFor: (*|string), designedBy: (*|string), version: number, items}}
 */
BMC.load = function importData(data) {

    if (data.designedFor) {
        $('#designed-for').val(data.designedFor);
    }

    if (data.designedBy) {
        $('#designed-by').val(data.designedBy);
    }

    if (data.version) {
        $('#version').val(data.version);
    }

    //Sem dados
    if (data.items) {
        //Criando os postits
        for (var group in data.items) {
            var parentElement = $('#pl-' + group);
            var postits = data.items[group];
            if (postits.length > 0) {
                for (var i in postits) {
                    var postit = postits[i];
                    new Postit(parentElement, postit.content, postit.color, true);
                }
            }
        }
    }
};


/**
 *
 * @returns {{designedFor: (*|string), designedBy: (*|string), version: number, items}}
 */
BMC.save = function () {
    var postits = {};
    Postit.INSTANCES.forEach(function (postit, i) {
        var elmnt = postit.$el;

        var block = elmnt.parent().attr('id').replace('pl-', '');
        var color = (
            elmnt
                .attr('class')
                .split(' ')
                .find(function (vl) {
                    return vl.indexOf('bg_color_') >= 0
                })
            || 'bg_color_255_255_136'
        ).replace('bg_color_', '');
        var content = $('.content', elmnt).text();
        var postitData = {
            'color': color,
            'content': content
        };

        if (!postits[block]) {
            postits[block] = [];
        }

        postits[block].push(postitData);
    });

    var $version = $('#version');
    var version = Number.parseInt($.trim($version.val()), 10);
    if (Number.isNaN(version)) {
        version = 1;
    }

    $version.val(version);

    var out = {
        designedFor: $.trim($('#designed-for').val()),
        designedBy: $.trim($('#designed-by').val()),
        version: version,
        items: postits
    };

    // Persist
    localStorage.setItem('BMC', JSON.stringify(out));

    return out;
};

/**
 * Usado para setar o focus no postit que está sendo editado no momento
 */
function focusPostitInput() {
    $('textarea[name=postit-edit]').focus();
}

/**
 * Representação de um postit
 *
 * @param parentElement
 * @param content
 * @param color
 * @param ignoreEditing
 * @constructor
 */
function Postit(parentElement, content, color, ignoreEditing) {
    var that = this;

    if (!Postit.EDITING || ignoreEditing) {

        Postit.INSTANCES.push(this);

        that.$el = $([
            '<li class="postit bg_color_255_255_136">',
            '    <div class="toolbar">',
            '        <span class="button delete" title="Remove">X</span>',
            '        <span class="button drag" title="Move">::</span>',
            '        <span class="button edit" title="Edit">E</span>',
            '        <span class="button color bg_color_255_255_136" title="Change color">&nbsp;</span>',
            '    </div>',
            '    <div class="content"></div>',
            '</li>'
        ].join(''));

        that.$el.appendTo(parentElement);

        //Adiciona evento para modificação da cor do postit
        $('.button.color', that.$el).on('click', function (e) {
            e.preventDefault();
            window.postitColorPicker.show($(this), BMC.save);
        });

        //Adiciona evento para deleção do postit
        $('.button.delete', that.$el).on('click', function (e) {
            e.preventDefault();
            that.delete();
        });

        $('.button.edit', that.$el).on('click', function (e) {
            e.preventDefault();
            that.edit();
        });

        var idParent = that.$el.parent().attr('id');
        that.$el.addClass('parent-' + idParent);

        //Adiciona evento para ediçao do postit
        $('.content', this.$el)
            .attr('id', 'postit-' + (new Date()).getTime())
            .on('click', function (e) {
                if (Postit.EDITING) {
                    return true;
                }
                e.preventDefault();
                that.edit();
            });

        //Seta a cor do postit
        if (color) {
            window.postitColorPicker.setPostitColor(that.$el, 'bg_color_' + color);
        }

        //Insere o conteudo no postit
        if (content) {
            $('.content', that.$el).html($.trim(content));
        } else {
            //Edita o postit recem criado
            that.edit();
        }
    } else {
        focusPostitInput();
    }
}

/**
 * Todas as instancias ativas dos prostits
 *
 * @type {Postit[]}
 */
Postit.INSTANCES = [];

/**
 * Postit sendo editado no momento
 *
 * @type {null}
 */
Postit.EDITING = null;

/**
 * Permite editar este postit
 */
Postit.prototype.edit = function () {
    var $el = this.$el;
    var $content = $('.content', this.$el);
    var id = $content.attr('id');
    if (!Postit.EDITING) {
        var width = $content.width();
        var height = $content.height();
        if (height < 50) {
            height = 50;
        }

        var textarea = $('<textarea name="postit-edit" ></textarea>')
            .width(width + 2)
            .height(height)
            .attr('id', id + '_field')
            .on('blur', function () {
                var $textarea = $(this);
                var value = $.trim($textarea.val());
                if (value !== '') {
                    $content.html(value);
                    Postit.EDITING = null;
                    $el.removeClass('edit');
                    BMC.save();
                    return false;
                }
                return null;
            })
            .html($.trim($content.text()));

        $content.html(textarea);
        Postit.EDITING = this;
        $el.addClass('edit');
    }
    focusPostitInput();
};

/**
 * Realiza a deleção deste postit
 */
Postit.prototype.delete = function () {
    var resp = confirm(_('M_REMOVE_POSTIT'));
    if (resp == true) {
        this.$el.remove();
        Postit.EDITING = null;
        var idx = Postit.INSTANCES.indexOf(this);
        if (idx >= 0) {
            Postit.INSTANCES.splice(idx, 1);
        }
        BMC.save();
    }
};

/**
 * Exporta os dados do modelo em arquivo JSON
 */
function exportJSON() {

    // Faz TAG da versão
    var $version = $('#version');
    var version = Number.parseInt($.trim($version.val()), 10);
    if (Number.isNaN(version)) {
        version = 1;
    }

    $version.val(version + 1);

    var json = BMC.save();

    // Create an invisible A element
    var a = document.createElement("a");
    a.style.display = "none";
    document.body.appendChild(a);

    // Set the HREF to a Blob representation of the data to be downloaded
    a.href = window.URL.createObjectURL(
        new Blob([JSON.stringify(json)], {type: 'text/json'})
    );


    var name = json.designedFor;
    if (name === '') {
        name = 'unnamed';
    }

    name = 'bmc-' + name.toLowerCase().replace(/(\s+)/g, '-');

    name += '-v' + json.version;

    // Use download attribute to set set desired file name
    a.setAttribute("download", name + '.json');

    // Trigger the download by simulating click
    a.click();

    // Cleanup
    window.URL.revokeObjectURL(a.href);
    document.body.removeChild(a);
}

/**
 * Exporta os dados do modelo em arquivo TXT, formatado
 */
function exportTXT() {

    var json = BMC.save();

    // Create an invisible A element
    var a = document.createElement("a");
    a.style.display = "none";
    document.body.appendChild(a);

    var name = json.designedFor;
    if (name === '') {
        name = 'Unnamed';
    }

    function list(items) {
        items = (items || []);
        if (items.length === 0) {
            return '   ?';
        }

        return '   ' + items.map(function (item, index) {
            return '' + (index + 1) + '. ' + item.content;
        }).join('\n      ');
    }

    var author = json.designedBy !== '' ? ', ' + _('L_TXT_BY') + ' ' + json.designedBy : '';
    var content = [
        _('L_TXT_BM') + ' - ' + name + ' (' + _('L_TXT_VERSION') + ' ' + json.version + author + ')',
        '',
        _('L_TXT_WHAT'),
        '   ' + _('L_VP'),
        '   ' + list(json.items.vp),
        '',
        _('L_TXT_WHO'),
        '   ' + _('L_CSG'),
        '   ' + list(json.items.csg),
        '    ',
        '   ' + _('L_CR'),
        '   ' + list(json.items.cr),
        '    ',
        '   ' + _('L_CH'),
        '   ' + list(json.items.ch),
        '',
        _('L_TXT_HOW'),
        '   ' + _('L_KA'),
        '   ' + list(json.items.ka),
        '    ',
        '   ' + _('L_KS'),
        '   ' + list(json.items.ks),
        '   ',
        '   ' + _('L_KP'),
        '   ' + list(json.items.kp),
        '',
        _('L_TXT_HOW_MUCH'),
        '   ' + _('L_RS'),
        '   ' + list(json.items.rs),
        '   ',
        '   ' + _('L_CS'),
        '   ' + list(json.items.cs),
    ].join('\n');

    name = 'bmc-' + name.toLowerCase().replace(/(\s+)/g, '-');
    name += '-v' + json.version;

    // Set the HREF to a Blob representation of the data to be downloaded
    a.href = window.URL.createObjectURL(
        new Blob([content], {type: 'text/plain'})
    );

    // Use download attribute to set set desired file name
    a.setAttribute("download", name + '.txt');

    // Trigger the download by simulating click
    a.click();

    // Cleanup
    window.URL.revokeObjectURL(a.href);
    document.body.removeChild(a);
}

/**
 * Importa os dados para o modelo
 */
function importJSON(doIMportData) {
    var input = document.createElement("input");
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = "none";
    document.body.appendChild(input);

    input.addEventListener('change', function (e) {
        var file = e.target.files[0];
        if (!file) {
            document.body.removeChild(input);
            return;
        }
        var reader = new FileReader();
        reader.onload = function (e) {
            var contents = e.target.result;
            //trata o json
            try {
                var data = JSON.parse(contents);
                BMC.load(data);
            } catch (e) {
                alert(_('E_IMPORT_JSON') + ' ' + e);
            }
        };
        reader.readAsText(file);
        document.body.removeChild(input);
    }, false);

    input.click();

}

/**
 * Bootstrap da ferramenta
 */
$(function () {

    //Evento para criação de novos postits
    $('.postit.new')
        .on('click', function () {
            new Postit($(this).next());
        });

    //Adiciona evento a paleta de cores
    $('.color-palette .swatch')
        .on('click', function (e) {
            e.preventDefault();
            window.postitColorPicker.set(this);
        });

    $('#designed-for, #designed-by').on('change', function () {
        BMC.save();
    });

    $('#BTN_CLEAR')
        .on('click', function (e) {
            e.preventDefault();
            var resp = confirm(_('M_CLEAR'));
            if (resp == true) {
                localStorage.removeItem('BMC');
                window.location.reload();
            }
        });

    $('#BTN_IMPORT')
        .on('click', function (e) {
            e.preventDefault();
            importJSON(false);
        });

    $('#BTN_EXPORT')
        .on('click', function (e) {
            e.preventDefault();
            exportJSON();
        });


    $('#BTN_EXPORT_TEXT')
        .on('click', function (e) {
            e.preventDefault();
            exportTXT();
        });

    //Adiciona evento de alteração de idioma
    var $language = $('#language-list');
    $language.on('change', function () {
        var lang = $(this).val();
        DICTIONARY = LANGUAGE[lang];
        $('._t').each(function (i, item) {
            var $el = $(item);
            var label = $el.attr('id');
            var value = _(label);
            if ($el.is('textarea, input')) {
                $el[0].placeholder = value;
            } else {
                $el.html(value);
            }
        });
        localStorage.setItem('BMC-LANG', lang);
    });

    // E já inicializa
    var lang = localStorage.getItem('BMC-LANG') || 'enUS';
    $language.val(lang);
    $language.trigger('change', function (e) {
    });

    /**
     * Drag and Drop de Postits
     */
    $(".postit-list").dragsort({
        dragSelector: '.drag',
        dragSelectorExclude: 'input, textarea, .new',
        itemSelector: '.postit',
        dragBetween: true,
        dragCloneClass: 'clone',
        dragEnd: function () {
            //Ordenando o botão new
            $(this).parent('.postit-list').find('.new').insertAfter(
                $(this).parent('.postit-list').find(".postit").not('.new').last()
            );

            var elmntClass = $(this).attr('class');
            elmntClass = elmntClass.split('parent-pl-');
            if (elmntClass.length > 0) {
                elmntClass = (elmntClass[1]).substr(0, 3);
            }


            var idParent = $(this).parent().attr('id');
            var classes = 'parent-pl-kp parent-pl-ka parent-pl-vp parent-pl-cr parent-pl-csg parent-pl-ks parent-pl-ch parent-pl-cs parent-pl-rs';

            $(this).removeClass(classes).addClass('parent-' + idParent);
        },
        placeHolderTemplate: "<li class='postit clone'></li>"
    });


    var saved = localStorage.getItem('BMC');
    if (saved) {
        try {
            var data = JSON.parse(saved);
            BMC.load(data);
        } catch (e) {
            console.log(e);
        }
    }
});
