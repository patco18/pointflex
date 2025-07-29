import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material';
import { useSnackbar } from 'notistack';

/**
 * Composant pour gérer les abonnements des entreprises
 */
const CompanySubscriptionsManagement = () => {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [plans, setPlans] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Charger les données initiales
  useEffect(() => {
    Promise.all([
      fetchCompanies(),
      fetchSubscriptionPlans()
    ]).then(() => {
      setLoading(false);
    });
  }, []);

  // Récupérer les entreprises
  const fetchCompanies = async () => {
    try {
      const response = await axios.get('/api/superadmin/companies');
      setCompanies(response.data.companies || []);
    } catch (error) {
      console.error('Erreur lors de la récupération des entreprises', error);
      enqueueSnackbar(t('subscription_management.fetch_companies_error'), { variant: 'error' });
    }
  };

  // Récupérer les plans d'abonnement
  const fetchSubscriptionPlans = async () => {
    try {
      // Utiliser la nouvelle route pour les plans d'abonnement
      const response = await axios.get('/api/subscription/plans');
      setPlans(response.data.plans || []);
    } catch (error) {
      console.error('Erreur lors de la récupération des plans d\'abonnement', error);
      enqueueSnackbar(t('subscription_management.fetch_plans_error'), { variant: 'error' });
    }
  };

  // Ouvrir la boîte de dialogue pour changer le plan d'une entreprise
  const handleOpenDialog = (company) => {
    // Trouver le plan actuel pour obtenir le max d'employés potentiel
    const currentPlanId = company.subscription_plan_id;
    const currentPlan = plans.find(p => p.id === currentPlanId);
    
    setSelectedCompany({
      ...company,
      keepCurrentMaxEmployees: true,
      potential_new_max_employees: currentPlan ? currentPlan.max_employees : company.max_employees
    });
    setDialogOpen(true);
  };

  // Fermer la boîte de dialogue
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedCompany(null);
  };

  // Mettre à jour le plan d'abonnement d'une entreprise
  const handleUpdateSubscription = async (company) => {
    if (!company || !company.subscription_plan_id) {
      enqueueSnackbar(t('subscription_management.invalid_data'), { variant: 'error' });
      return;
    }
    
    try {
      setLoading(true);
      // Appeler la nouvelle route pour mettre à jour le plan d'abonnement
      await axios.put(`/api/superadmin/companies/${company.id}/subscription`, {
        subscription_plan_id: company.subscription_plan_id,
        keep_current_max_employees: company.keepCurrentMaxEmployees || false
      });
      
      enqueueSnackbar(t('subscription_management.update_success'), { variant: 'success' });
      await fetchCompanies();
      handleCloseDialog();
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'abonnement', error);
      enqueueSnackbar(t('subscription_management.update_error'), { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Trouver le nom du plan pour un ID donné
  const getPlanNameById = (planId) => {
    const plan = plans.find(p => p.id === planId);
    return plan ? plan.name : t('subscription_management.unknown_plan');
  };

  // Formater la date d'expiration
  const formatExpirationDate = (date) => {
    if (!date) return t('subscription_management.no_expiration');
    return new Date(date).toLocaleDateString();
  };

  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          {t('subscription_management.company_subscriptions')}
        </Typography>

        {loading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Paper>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('subscription_management.company_name')}</TableCell>
                    <TableCell>{t('subscription_management.current_plan')}</TableCell>
                    <TableCell>{t('subscription_management.subscription_status')}</TableCell>
                    <TableCell>{t('subscription_management.expiration_date')}</TableCell>
                    <TableCell>{t('subscription_management.max_employees')}</TableCell>
                    <TableCell>{t('subscription_management.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {companies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        {t('subscription_management.no_companies')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    companies.map((company) => (
                      <TableRow key={company.id}>
                        <TableCell>{company.name}</TableCell>
                        <TableCell>
                          {company.subscription_plan_id ? 
                            getPlanNameById(company.subscription_plan_id) : 
                            company.subscription_plan || t('subscription_management.no_plan')}
                        </TableCell>
                        <TableCell>
                          <Box 
                            component="span" 
                            sx={{ 
                              color: company.subscription_status === 'active' ? 'success.main' : 'warning.main',
                              fontWeight: 'bold'
                            }}
                          >
                            {company.subscription_status}
                          </Box>
                        </TableCell>
                        <TableCell>{formatExpirationDate(company.subscription_end)}</TableCell>
                        <TableCell>{company.max_employees}</TableCell>
                        <TableCell>
                          <Button 
                            variant="outlined" 
                            color="primary"
                            size="small"
                            onClick={() => handleOpenDialog(company)}
                          >
                            {t('subscription_management.change_plan')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </Box>

      {/* Boîte de dialogue pour changer le plan d'abonnement */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog}>
        <DialogTitle>{t('subscription_management.change_subscription_plan')}</DialogTitle>
        <DialogContent>
          {selectedCompany && (
            <>
              <DialogContentText>
                {t('subscription_management.change_plan_for', { company: selectedCompany.name })}
              </DialogContentText>
              <FormControl fullWidth margin="normal">
                <InputLabel id="plan-select-label">{t('subscription_management.subscription_plan')}</InputLabel>
                <Select
                  labelId="plan-select-label"
                  value={selectedCompany.subscription_plan_id || ''}
                  onChange={(e) => {
                    const planId = e.target.value;
                    const selectedPlan = plans.find(p => p.id === planId);
                    setSelectedCompany({
                      ...selectedCompany,
                      subscription_plan_id: planId,
                      potential_new_max_employees: selectedPlan ? selectedPlan.max_employees : selectedCompany.max_employees
                    });
                  }}
                >
                  {plans.map((plan) => (
                    <MenuItem key={plan.id} value={plan.id}>
                      {plan.name} - Max {plan.max_employees} {t('subscription_management.employees')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl component="fieldset" margin="normal">
                <FormControlLabel
                  control={
                    <Switch
                      checked={selectedCompany.keepCurrentMaxEmployees || false}
                      onChange={(e) => setSelectedCompany({
                        ...selectedCompany,
                        keepCurrentMaxEmployees: e.target.checked
                      })}
                    />
                  }
                  label={t('subscription_management.keep_current_max_employees')}
                />
              </FormControl>
              
              <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                {selectedCompany.keepCurrentMaxEmployees 
                  ? t('subscription_management.will_keep_current_max', { current: selectedCompany.max_employees })
                  : t('subscription_management.will_use_plan_max', { max: selectedCompany.potential_new_max_employees || 'N/A' })
                }
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={() => handleUpdateSubscription(selectedCompany)} 
            color="primary"
            variant="contained"
            disabled={loading || !selectedCompany || !selectedCompany.subscription_plan_id}
          >
            {loading ? <CircularProgress size={24} /> : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CompanySubscriptionsManagement;
