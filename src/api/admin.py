import os
import inspect
from flask_admin import Admin
from . import models
from .models import db
from flask_admin.contrib.sqla import ModelView
from flask_admin.theme import Bootstrap4Theme


class IndicatorModelView(ModelView):
    column_list = ('id_indicator', 'template_id', 'project_id',
                   'calculation_type', 'depends_on')
    # Esto permitirá que en el formulario de edición puedas elegir las dependencias
    form_columns = ('template', 'project', 'calculation_type',
                    'measurement_unit', 'depends_on', 'target_total')


def setup_admin(app):
    app.secret_key = os.environ.get('FLASK_APP_KEY', 'sample key')
    admin = Admin(app, name='4Geeks Admin',
                  theme=Bootstrap4Theme(swatch='cerulean'))

    for name, obj in inspect.getmembers(models):
        if inspect.isclass(obj) and issubclass(obj, db.Model):
            # 2. Si el modelo es Indicator, usa la vista personalizada
            if name == 'Indicator':
                admin.add_view(IndicatorModelView(obj, db.session))
            else:
                admin.add_view(ModelView(obj, db.session))
