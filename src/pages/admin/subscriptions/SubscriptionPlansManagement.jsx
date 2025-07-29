import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  CircularProgress, 
  Container, 
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Paper
} from '@mui/material';
import { 
  Add as AddIcon,
  Delete as DeleteIcon, 
  Edit as EditIcon,
  EuroSymbol as EuroIcon,
  People as PeopleIcon,
  Description as DescriptionIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useAuth } from '../../../contexts/AuthContext';
import { Link } from 'react-router-dom';

/**
 * Composant de gestion des plans d'abonnement
 * Ce composant permet aux administrateurs de créer, modifier et supprimer des plans d'abonnement
 */
const SubscriptionPlansManagement = () => {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const { currentUser } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price_monthly: 0,
    price_yearly: 0,
    max_employees: 10,
    features: '',
    is_active: true,
    is_default: false,
    display_order: 0
  });
  const [formErrors, setFormErrors] = useState({});

  // Charger les plans d'abonnement au chargement du composant
  useEffect(() => {
    fetchSubscriptionPlans();
  }, []);

  // Récupérer les plans d'abonnement depuis l'API
  const fetchSubscriptionPlans = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/superadmin/subscription-plans');
      setPlans(response.data.plans);
    } catch (error) {
      console.error('Erreur lors de la récupération des plans d\'abonnement', error);
      enqueueSnackbar(t('subscription_plans.load_error'), { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Ouvrir la boîte de dialogue pour ajouter ou modifier un plan
  const handleOpenDialog = (plan = null) => {
    if (plan) {
      // Mode édition
      const planFeatures = typeof plan.features === 'string' 
        ? plan.features 
        : Array.isArray(plan.features) 
          ? plan.features.join('\n')
          : '';

      setFormData({
        name: plan.name || '',
        description: plan.description || '',
        price_monthly: plan.price_monthly || 0,
        price_yearly: plan.price_yearly || 0,
        max_employees: plan.max_employees || 10,
        features: planFeatures,
        is_active: plan.is_active !== undefined ? plan.is_active : true,
        is_default: plan.is_default !== undefined ? plan.is_default : false,
        display_order: plan.display_order || 0
      });
      setCurrentPlan(plan);
    } else {
      // Mode création
      setFormData({
        name: '',
        description: '',
        price_monthly: 0,
        price_yearly: 0,
        max_employees: 10,
        features: '',
        is_active: true,
        is_default: false,
        display_order: plans.length + 1
      });
      setCurrentPlan(null);
    }
    setOpenDialog(true);
    setFormErrors({});
  };

  // Fermer la boîte de dialogue
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentPlan(null);
    setFormErrors({});
  };

  // Gérer les changements dans le formulaire
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
    
    // Effacer les erreurs pour ce champ
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: null
      });
    }
  };

  // Valider le formulaire
  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = t('subscription_plans.validation.name_required');
    }
    
    if (formData.price_monthly < 0) {
      errors.price_monthly = t('subscription_plans.validation.price_positive');
    }
    
    if (formData.price_yearly < 0) {
      errors.price_yearly = t('subscription_plans.validation.price_positive');
    }
    
    if (formData.max_employees <= 0) {
      errors.max_employees = t('subscription_plans.validation.employees_positive');
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Soumettre le formulaire
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    // Préparer les données à envoyer
    const planData = {
      ...formData,
      // Convertir les fonctionnalités de texte en tableau
      features: formData.features.split('\n').filter(f => f.trim().length > 0)
    };
    
    try {
      setLoading(true);
      if (currentPlan) {
        // Mise à jour d'un plan existant
        await axios.put(`/api/superadmin/subscription-plans/${currentPlan.id}`, planData);
        enqueueSnackbar(t('subscription_plans.update_success'), { variant: 'success' });
      } else {
        // Création d'un nouveau plan
        await axios.post('/api/superadmin/subscription-plans', planData);
        enqueueSnackbar(t('subscription_plans.create_success'), { variant: 'success' });
      }
      
      handleCloseDialog();
      fetchSubscriptionPlans();
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du plan d\'abonnement', error);
      enqueueSnackbar(t('subscription_plans.save_error'), { variant: 'error' });
      
      // Afficher les erreurs de validation du backend
      if (error.response && error.response.data && error.response.data.errors) {
        setFormErrors(error.response.data.errors);
      }
    } finally {
      setLoading(false);
    }
  };

  // Supprimer un plan d'abonnement
  const handleDeletePlan = async (id) => {
    if (!window.confirm(t('subscription_plans.confirm_delete'))) return;
    
    try {
      setLoading(true);
      await axios.delete(`/api/superadmin/subscription-plans/${id}`);
      enqueueSnackbar(t('subscription_plans.delete_success'), { variant: 'success' });
      fetchSubscriptionPlans();
    } catch (error) {
      console.error('Erreur lors de la suppression du plan d\'abonnement', error);
      enqueueSnackbar(t('subscription_plans.delete_error'), { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Affichage des fonctionnalités en liste
  const renderFeatures = (features) => {
    if (!features) return null;
    
    let featureList = [];
    if (typeof features === 'string') {
      try {
        featureList = JSON.parse(features);
      } catch {
        featureList = features.split('\n');
      }
    } else if (Array.isArray(features)) {
      featureList = features;
    }
    
    return (
      <ul style={{ paddingLeft: '20px', margin: '5px 0' }}>
        {featureList.map((feature, index) => (
          <li key={index}>{feature}</li>
        ))}
      </ul>
    );
  };

  // Formatage du prix pour affichage
  const formatPrice = (price) => {
    if (price === null || price === undefined) return '-';
    return `${(price / 100).toFixed(2)} €`;
  };

  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          {t('subscription_plans.title')}
        </Typography>
        
        <Box mb={3} display="flex" justifyContent="space-between">
          <Button
            component={Link}
            to="/admin/subscriptions/plans/display"
            color="secondary"
            variant="outlined"
            startIcon={<VisibilityIcon />}
          >
            Voir les plans en base de données
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            disabled={loading}
          >
            {t('subscription_plans.add_plan')}
          </Button>
        </Box>
        
        {loading && !openDialog ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('subscription_plans.name')}</TableCell>
                  <TableCell>{t('subscription_plans.max_employees')}</TableCell>
                  <TableCell>{t('subscription_plans.price_monthly')}</TableCell>
                  <TableCell>{t('subscription_plans.price_yearly')}</TableCell>
                  <TableCell>{t('subscription_plans.features')}</TableCell>
                  <TableCell>{t('subscription_plans.status')}</TableCell>
                  <TableCell>{t('subscription_plans.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {plans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      {t('subscription_plans.no_plans')}
                    </TableCell>
                  </TableRow>
                ) : (
                  plans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell>
                        <Typography variant="subtitle1">
                          {plan.name}
                          {plan.is_default && (
                            <Typography variant="caption" color="primary" sx={{ ml: 1 }}>
                              ({t('subscription_plans.default')})
                            </Typography>
                          )}
                        </Typography>
                      </TableCell>
                      <TableCell>{plan.max_employees}</TableCell>
                      <TableCell>{formatPrice(plan.price_monthly)}</TableCell>
                      <TableCell>{formatPrice(plan.price_yearly)}</TableCell>
                      <TableCell>{renderFeatures(plan.features)}</TableCell>
                      <TableCell>
                        <Typography 
                          variant="body2"
                          color={plan.is_active ? 'success.main' : 'text.disabled'}
                        >
                          {plan.is_active ? t('subscription_plans.active') : t('subscription_plans.inactive')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton 
                          color="primary" 
                          onClick={() => handleOpenDialog(plan)}
                          title={t('subscription_plans.edit')}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          color="error" 
                          onClick={() => handleDeletePlan(plan.id)}
                          title={t('subscription_plans.delete')}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Boîte de dialogue pour ajouter/modifier un plan */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {currentPlan ? t('subscription_plans.edit_plan') : t('subscription_plans.add_plan')}
        </DialogTitle>
        <DialogContent>
          <Box my={2}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  label={t('subscription_plans.name')}
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  margin="normal"
                  error={!!formErrors.name}
                  helperText={formErrors.name}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <DescriptionIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label={t('subscription_plans.max_employees')}
                  name="max_employees"
                  type="number"
                  value={formData.max_employees}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  margin="normal"
                  error={!!formErrors.max_employees}
                  helperText={formErrors.max_employees}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PeopleIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label={t('subscription_plans.price_monthly')}
                  name="price_monthly"
                  type="number"
                  value={formData.price_monthly}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  margin="normal"
                  error={!!formErrors.price_monthly}
                  helperText={formErrors.price_monthly}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EuroIcon color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: <InputAdornment position="end">cents</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label={t('subscription_plans.price_yearly')}
                  name="price_yearly"
                  type="number"
                  value={formData.price_yearly}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  margin="normal"
                  error={!!formErrors.price_yearly}
                  helperText={formErrors.price_yearly}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EuroIcon color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: <InputAdornment position="end">cents</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label={t('subscription_plans.description')}
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  fullWidth
                  multiline
                  rows={2}
                  margin="normal"
                  error={!!formErrors.description}
                  helperText={formErrors.description}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label={t('subscription_plans.features')}
                  name="features"
                  value={formData.features}
                  onChange={handleInputChange}
                  fullWidth
                  multiline
                  rows={4}
                  margin="normal"
                  error={!!formErrors.features}
                  helperText={formErrors.features || t('subscription_plans.features_help')}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl component="fieldset" margin="normal">
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.is_active}
                        onChange={handleInputChange}
                        name="is_active"
                        color="primary"
                      />
                    }
                    label={t('subscription_plans.is_active')}
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl component="fieldset" margin="normal">
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.is_default}
                        onChange={handleInputChange}
                        name="is_default"
                        color="primary"
                      />
                    }
                    label={t('subscription_plans.is_default')}
                  />
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label={t('subscription_plans.display_order')}
                  name="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={handleInputChange}
                  fullWidth
                  margin="normal"
                  error={!!formErrors.display_order}
                  helperText={formErrors.display_order}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={handleSubmit} 
            color="primary" 
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SubscriptionPlansManagement;
